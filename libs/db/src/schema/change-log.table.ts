import { integer, jsonb, pgTable, serial, timestamp } from 'drizzle-orm/pg-core';
import { satellites } from './satellites.table';
import { syncJobs } from './sync-jobs.table';

export const satelliteChangeLog = pgTable('satellite_change_log', {
  id:             serial('id').primaryKey(),
  norad_cat_id:   integer('norad_cat_id').notNull().references(() => satellites.norad_cat_id),
  sync_job_id:    integer('sync_job_id').notNull().references(() => syncJobs.id),
  changed_at:     timestamp('changed_at', { withTimezone: true }).notNull().defaultNow(),
  changed_fields: jsonb('changed_fields').$type<string[]>().notNull(),
  old_values:     jsonb('old_values').$type<Record<string, unknown>>().notNull(),
  new_values:     jsonb('new_values').$type<Record<string, unknown>>().notNull(),
});

export type DbChangeLog    = typeof satelliteChangeLog.$inferSelect;
export type NewDbChangeLog = typeof satelliteChangeLog.$inferInsert;
