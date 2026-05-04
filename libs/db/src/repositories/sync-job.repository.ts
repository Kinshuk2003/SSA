import { and, desc, eq, sql } from 'drizzle-orm';
import type { SyncStats, SyncStatus, CounterDelta } from '@ssa/shared';
import type { Db } from '../client';
import { syncJobs } from '../schema/sync-jobs.table';
import { satellites } from '../schema/satellites.table';
import type { ISyncJobRepository, ClaimedRun } from './sync-job.repository.interface';

function nextMidnightUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
}


export class SyncJobRepository implements ISyncJobRepository {
  constructor(private readonly db: Db) {}

  async claimRun(scheduledAt: Date): Promise<ClaimedRun | null> {
    const [row] = await this.db
      .insert(syncJobs)
      .values({
        scheduled_at: scheduledAt,
        started_at:   sql`NOW()`,
        status:       'running',
      })
      .onConflictDoNothing()
      .returning({
        id:           syncJobs.id,
        scheduled_at: syncJobs.scheduled_at,
      });

    if (!row) return null;
    return { id: row.id, scheduled_at: row.scheduled_at.toISOString() };
  }

  async markCompleted(id: number, stats: SyncStats): Promise<void> {
    await this.db
      .update(syncJobs)
      .set({
        status:           'completed',
        completed_at:     sql`NOW()`,
        records_upserted: stats.records_upserted,
        records_skipped:  stats.records_skipped,
        records_failed:   stats.records_failed,
      })
      .where(eq(syncJobs.id, id));
  }

  async markFailed(id: number, error: string): Promise<void> {
    await this.db
      .update(syncJobs)
      .set({
        status:        'failed',
        completed_at:  sql`NOW()`,
        error_message: error,
      })
      .where(eq(syncJobs.id, id));
  }

  async incrementCounters(id: number, delta: CounterDelta): Promise<void> {
    const set: Record<string, ReturnType<typeof sql>> = {};

    if (delta.upserted != null) {
      set['records_upserted'] = sql`COALESCE(${syncJobs.records_upserted}, 0) + ${delta.upserted}`;
    }
    if (delta.skipped != null) {
      set['records_skipped'] = sql`COALESCE(${syncJobs.records_skipped}, 0) + ${delta.skipped}`;
    }
    if (delta.failed != null) {
      set['records_failed'] = sql`COALESCE(${syncJobs.records_failed}, 0) + ${delta.failed}`;
    }

    await this.db
      .update(syncJobs)
      .set(set)
      .where(eq(syncJobs.id, id));
  }

  async getLatest(): Promise<SyncStatus | null> {
    const [row] = await this.db
      .select()
      .from(syncJobs)
      .orderBy(desc(syncJobs.scheduled_at))
      .limit(1);

    if (!row) return null;

    const [{ total }] = await this.db
      .select({ total: sql<number>`COUNT(*)::integer` })
      .from(satellites);

    return {
      id:               row.id,
      status:           row.status as SyncStatus['status'],
      scheduled_at:     row.scheduled_at.toISOString(),
      started_at:       row.started_at.toISOString(),
      completed_at:     row.completed_at?.toISOString() ?? null,
      next_sync_at:     nextMidnightUtc().toISOString(),
      records_total:    total,
      records_upserted: row.records_upserted,
      records_skipped:  row.records_skipped,
      records_failed:   row.records_failed,
      error_message:    row.error_message,
    };
  }

  async deleteForDate(scheduledAt: Date): Promise<void> {
    await this.db
      .delete(syncJobs)
      .where(eq(syncJobs.scheduled_at, scheduledAt));
  }

  async resetStale(scheduledAt: Date): Promise<void> {
    const thresholdMinutes = parseInt(
      process.env['STALE_LOCK_THRESHOLD_MINUTES'] ?? '30',
      10,
    );

    await this.db
      .update(syncJobs)
      .set({ status: 'failed', error_message: 'Stale lock reset by watchdog' })
      .where(
        and(
          eq(syncJobs.scheduled_at, scheduledAt),
          eq(syncJobs.status, 'running'),
          sql`${syncJobs.started_at} < NOW() - (${thresholdMinutes}::integer * INTERVAL '1 minute')`,
        ),
      );
  }
}
