import { z } from 'zod';

export const SyncJobStatusSchema = z.enum(['running', 'completed', 'failed']);
export type SyncJobStatus = z.infer<typeof SyncJobStatusSchema>;


export const SyncStatusSchema = z.object({
  id:               z.number().int().positive(),
  status:           SyncJobStatusSchema,
  scheduled_at:     z.string(), // ISO 8601 UTC — the midnight window this run owns
  started_at:       z.string().nullable(),
  completed_at:     z.string().nullable(),
  next_sync_at:     z.string(), // Always next midnight UTC, computed not stored
  records_total:    z.number().int().nonnegative(),
  records_upserted: z.number().int().nonnegative().nullable(),
  records_skipped:  z.number().int().nonnegative().nullable(),
  records_failed:   z.number().int().nonnegative().nullable(),
  error_message:    z.string().nullable(),
});

export type SyncStatus = z.infer<typeof SyncStatusSchema>;

export const SyncStatsSchema = z.object({
  records_upserted: z.number().int().nonnegative(),
  records_skipped:  z.number().int().nonnegative(),
  records_failed:   z.number().int().nonnegative(),
});

export type SyncStats = z.infer<typeof SyncStatsSchema>;

export const CounterDeltaSchema = z
  .object({
    upserted: z.number().int().nonnegative().optional(),
    skipped:  z.number().int().nonnegative().optional(),
    failed:   z.number().int().nonnegative().optional(),
  })
  .refine(
    (v) => v.upserted !== undefined || v.skipped !== undefined || v.failed !== undefined,
    { message: 'CounterDelta must include at least one counter field' },
  );

export type CounterDelta = z.infer<typeof CounterDeltaSchema>;
