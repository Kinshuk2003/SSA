import { Injectable, OnApplicationBootstrap, Inject } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SYNC_JOB_REPOSITORY, type ISyncJobRepository } from '@ssa/db';
import { SYNC_QUEUE_NAME, type SyncJobPayload } from './sync.constants';

function todayMidnightUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}


@Injectable()
export class SyncSchedulerService implements OnApplicationBootstrap {
  constructor(
    @InjectQueue(SYNC_QUEUE_NAME)
    private readonly syncQueue: Queue<SyncJobPayload>,

    @Inject(SYNC_JOB_REPOSITORY)
    private readonly syncJobRepo: ISyncJobRepository,
  ) {}

  /**
   * On every startup, check the DB to determine whether today's sync has already run.  If not, enqueue it.
   *
   * This handles two recovery scenarios:
   *   1. The service was down at midnight — today's sync was never triggered.
   *   2. The process restarted mid-day after a completed sync — the DB shows
   *      status='completed', so enqueueTodaySync() is skipped.
   *
   * The BullMQ jobId deduplication ensures that even if multiple instances start simultaneously, only one job enters the queue.
   */
  async onApplicationBootstrap(): Promise<void> {
    const todayMidnight = todayMidnightUtc();
    const latest        = await this.syncJobRepo.getLatest();

    const latestAt = latest ? new Date(latest.scheduled_at).getTime() : 0;

    if (latestAt < todayMidnight.getTime()) {
      console.log('[SyncScheduler] no sync found for today — enqueueing catch-up');
      await this.enqueueTodaySync();
    } else {
      console.log('[SyncScheduler] today\'s sync already recorded — skipping startup enqueue');
    }
  }

  // Fires at midnight UTC every day.
  @Cron('0 0 * * *', { timeZone: 'UTC', name: 'daily-sync-cron' })
  async onMidnight(): Promise<void> {
    console.log('[SyncScheduler] midnight UTC cron fired — enqueueing sync');
    await this.enqueueTodaySync();
  }

  private async enqueueTodaySync(): Promise<void> {
    const midnight = todayMidnightUtc();
    const jobId    = `daily-sync-${midnight.toISOString().split('T')[0]}`;

    await this.syncQueue.add(
      'daily-sync',
      { scheduledAt: midnight.toISOString() },
      {
        jobId,                         
        removeOnComplete: { count: 7 },
        removeOnFail:     { count: 7 },
      },
    );

    console.log(`[SyncScheduler] enqueued job  ${jobId}`);
  }
}
