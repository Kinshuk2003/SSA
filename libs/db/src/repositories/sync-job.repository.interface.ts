import type { SyncStatus, SyncStats, CounterDelta } from '@ssa/shared';

export interface ClaimedRun {
  id:           number;
  scheduled_at: string; 
}


export interface ISyncJobRepository {
  /**
   * Atomically claim a sync run for the given midnight window.
   *
   * Executes:
   *   INSERT INTO sync_jobs (scheduled_at, started_at, status)
   *   VALUES ($1, NOW(), 'running')
   *   ON CONFLICT (scheduled_at) DO NOTHING
   *   RETURNING id, scheduled_at
   *
   * Returns the ClaimedRun if this worker won the race, null if another
   * worker already holds the lock for this scheduled_at.
   */
  claimRun(scheduledAt: Date): Promise<ClaimedRun | null>;

  /**
   * Mark the run as completed and write the final aggregate counters.
   * Called once — after all batch jobs for this run have finished.
   */
  markCompleted(id: number, stats: SyncStats): Promise<void>;

  /**
   * Mark the run as failed.  error is stored in error_message.
   * Idempotent — safe to call on an already-failed row.
   */
  markFailed(id: number, error: string): Promise<void>;

  /**
   * Atomically increment one or more counters for a run in progress.
   * Uses COALESCE(col, 0) + delta so NULL starting values are handled.
   * Called after each processed batch from the upsert workers.
   */
  incrementCounters(id: number, delta: CounterDelta): Promise<void>;

  /**
   * Return the most recent sync job with computed fields:
   *   next_sync_at  — next midnight UTC (computed, not stored)
   *   records_total — live COUNT(*) from the satellites table
   *
   * Returns null if no sync has ever run (fresh deployment).
   */
  getLatest(): Promise<SyncStatus | null>;

  /**
   * Reset a stale running job to failed so the next worker can claim it.
   * "Stale" = status is 'running' AND started_at is older than the
   * STALE_LOCK_THRESHOLD_MINUTES environment variable (default 30 min).
   */
  resetStale(scheduledAt: Date): Promise<void>;

  /**
   * Delete the sync_jobs row for the given midnight window.
   * Used by the manual trigger endpoint (force=true) to remove a zombie
   * 'running' or already-completed record so claimRun() can INSERT afresh.
   */
  deleteForDate(scheduledAt: Date): Promise<void>;
}

export const SYNC_JOB_REPOSITORY = Symbol('ISyncJobRepository');
