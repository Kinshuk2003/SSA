import { Injectable, Inject } from '@nestjs/common';
import {
  SATELLITE_REPOSITORY,
  SYNC_JOB_REPOSITORY,
  type ISatelliteRepository,
  type ISyncJobRepository,
  type ChangeLogEntry,
} from '@ssa/db';
import type { Satellite, SatelliteUpsertRow } from '@ssa/shared';
import { CelesTrakFetcherService } from '../fetcher/celestrak.fetcher.service';
import { TRACKED_FIELDS, type TrackedField } from './sync.constants';


function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// Orchestrator Service
// Single responsibility only to coordinate the sync pipeline for one midnight window.
@Injectable()
export class SyncOrchestratorService {
  constructor(
    @Inject(SATELLITE_REPOSITORY) private readonly satelliteRepo: ISatelliteRepository,
    @Inject(SYNC_JOB_REPOSITORY)  private readonly syncJobRepo:   ISyncJobRepository,
    private readonly fetcher: CelesTrakFetcherService,
  ) {}

  /**
   * Ingestion Pipeline Business logic Flow:
   *   1. resetStale — clear any zombie 'running' lock from a crashed previous run
   *   2. claimRun  — atomic INSERT; returns null if another worker already claimed it
   *   3. fetchAll  — download + parse + hash CelesTrak CSV
   *   4. batch loop — for each 500-row chunk:
   *        a. bulkFetchHashes — get stored hashes
   *        b. findManyByNoradIds — get old values for changed rows (change log)
   *        c. upsertMany — conditional bulk upsert
   *        d. insertChangeLogs — field-level diff records
   *        e. incrementCounters — live progress update
   *   5. markCompleted — finalize with total counters
   *
   * Any exception calls markFailed and re-throws so BullMQ records the job as failed.
   */
  async run(scheduledAt: Date): Promise<void> {
    const batchSize = parseInt(process.env['BATCH_SIZE'] ?? '500', 10);

    await this.syncJobRepo.resetStale(scheduledAt);

    const run = await this.syncJobRepo.claimRun(scheduledAt);
    if (!run) {
      console.log(`[SyncOrchestrator] ${scheduledAt.toISOString()} already claimed — exiting`);
      return;
    }

    console.log(`[SyncOrchestrator] claimed run id=${run.id} for ${run.scheduled_at}`);

    try {
      const { rows, failedCount } = await this.fetcher.fetchAll();

      if (failedCount > 0) {
        await this.syncJobRepo.incrementCounters(run.id, { failed: failedCount });
      }

      const batches = chunk(rows, batchSize);
      let totalUpserted = 0;
      let totalSkipped  = 0;

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`[SyncOrchestrator] batch ${i + 1}/${batches.length} (${batch.length} rows)`);

        const { upserted, skipped } = await this.processBatch(run.id, batch);
        totalUpserted += upserted;
        totalSkipped  += skipped;

        await this.syncJobRepo.incrementCounters(run.id, { upserted, skipped });
      }

      await this.syncJobRepo.markCompleted(run.id, {
        records_upserted: totalUpserted,
        records_skipped:  totalSkipped,
        records_failed:   failedCount,
      });

      console.log(
        `[SyncOrchestrator] completed run id=${run.id} ` +
        `upserted=${totalUpserted} skipped=${totalSkipped} failed=${failedCount}`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[SyncOrchestrator] run id=${run.id} failed:`, msg);
      await this.syncJobRepo.markFailed(run.id, msg);
      throw err; // re-throw so BullMQ marks the job as failed
    }
  }

  private async processBatch(
    syncJobId: number,
    batch: SatelliteUpsertRow[],
  ): Promise<{ upserted: number; skipped: number }> {
    const ids      = batch.map((r) => r.norad_cat_id);
    const batchMap = new Map(batch.map((r) => [r.norad_cat_id, r]));

    const existingHashes = await this.satelliteRepo.bulkFetchHashes(ids);

    const updatedIds = ids.filter((id) => {
      const oldHash = existingHashes.get(id);
      return oldHash !== undefined && oldHash !== batchMap.get(id)!.content_hash;
    });

    const oldRows =
      updatedIds.length > 0
        ? await this.satelliteRepo.findManyByNoradIds(updatedIds)
        : [];

    const oldRowMap = new Map(oldRows.map((r) => [r.norad_cat_id, r]));

    const stats = await this.satelliteRepo.upsertMany(batch);

    const changeLogs = this.buildChangeLogs(batch, oldRowMap, syncJobId);
    if (changeLogs.length > 0) {
      await this.satelliteRepo.insertChangeLogs(changeLogs);
    }

    return stats;
  }

  private buildChangeLogs(
    batch: SatelliteUpsertRow[],
    oldRowMap: Map<number, Satellite>,
    syncJobId: number,
  ): ChangeLogEntry[] {
    const entries: ChangeLogEntry[] = [];

    for (const newRow of batch) {
      const oldRow = oldRowMap.get(newRow.norad_cat_id);
      if (!oldRow) continue; // first-time INSERT — no previous state to diff

      const changedFields: string[]               = [];
      const oldValues: Record<string, unknown>    = {};
      const newValues: Record<string, unknown>    = {};

      for (const field of TRACKED_FIELDS) {
        const oldVal = oldRow[field as keyof Satellite];
        const newVal = newRow[field as TrackedField];
        if (oldVal !== newVal) {
          changedFields.push(field);
          oldValues[field] = oldVal;
          newValues[field] = newVal;
        }
      }

      if (changedFields.length > 0) {
        entries.push({
          norad_cat_id:   newRow.norad_cat_id,
          sync_job_id:    syncJobId,
          changed_fields: changedFields,
          old_values:     oldValues,
          new_values:     newValues,
        });
      }
    }

    return entries;
  }
}
