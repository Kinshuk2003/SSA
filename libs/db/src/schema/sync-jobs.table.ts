import { integer, pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core';

export const syncJobs = pgTable('sync_jobs', {
  id:               serial('id').primaryKey(),
  scheduled_at:     timestamp('scheduled_at', { withTimezone: true }).notNull().unique(),
  started_at:       timestamp('started_at',   { withTimezone: true }).notNull(),
  completed_at:     timestamp('completed_at', { withTimezone: true }),
  status:           varchar('status').notNull(),
  records_upserted: integer('records_upserted'),
  records_skipped:  integer('records_skipped'),
  records_failed:   integer('records_failed'),
  error_message:    text('error_message'),
});

export type DbSyncJob    = typeof syncJobs.$inferSelect;
export type NewDbSyncJob = typeof syncJobs.$inferInsert;
