import { Injectable, Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SYNC_JOB_REPOSITORY, type ISyncJobRepository } from '@ssa/db';
import type { SyncStatus } from '@ssa/shared';

function todayMidnightUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

@Injectable()
export class SyncService {
  constructor(
    @Inject(SYNC_JOB_REPOSITORY)
    private readonly repo: ISyncJobRepository,

    @InjectQueue('sync')
    private readonly syncQueue: Queue,
  ) {}

  getStatus(): Promise<SyncStatus | null> {
    return this.repo.getLatest();
  }

  /**
   * Enqueue a sync for today's midnight window.
   *
   * Normal mode: BullMQ's jobId deduplication silently ignores the add if a
   * job with the same id is already waiting, active, or completed.
   *
   * Force mode: deletes the sync_jobs DB row and removes the BullMQ job first
   * so a fresh run can be claimed — useful to recover from a zombie 'running'
   * record from a crashed worker.
   */
  async triggerSync(force: boolean): Promise<{ jobId: string }> {
    const midnight = todayMidnightUtc();
    const jobId    = `daily-sync-${midnight.toISOString().split('T')[0]}`;

    if (force) {
      await this.repo.deleteForDate(midnight);
      const existing = await this.syncQueue.getJob(jobId);
      await existing?.remove();
    }

    await this.syncQueue.add(
      'daily-sync',
      { scheduledAt: midnight.toISOString() },
      { jobId, removeOnComplete: { count: 7 }, removeOnFail: { count: 7 } },
    );

    return { jobId };
  }
}