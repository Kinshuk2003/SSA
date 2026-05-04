import { integer, numeric, pgTable, text, timestamp, varchar, date } from 'drizzle-orm/pg-core';

export const satellites = pgTable('satellites', {
  norad_cat_id:     integer('norad_cat_id').primaryKey(),
  object_name:      varchar('object_name').notNull(),
  object_id:        varchar('object_id').notNull(),
  object_type:      varchar('object_type').notNull(),
  ops_status:       varchar('ops_status'),
  owner:            varchar('owner'),
  launch_site:      varchar('launch_site'),
  launch_date:      date('launch_date'),
  decay_date:       date('decay_date'),
  period:           numeric('period', { precision: 10, scale: 4 }),
  inclination:      numeric('inclination', { precision: 8, scale: 4 }),
  apogee:           integer('apogee'),
  perigee:          integer('perigee'),
  rcs:              varchar('rcs'),
  data_status_code: varchar('data_status_code'),
  orbit_center:     varchar('orbit_center'),
  orbit_type:       varchar('orbit_type'),
  content_hash:     text('content_hash').notNull(),
  created_at:       timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at:       timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type DbSatellite    = typeof satellites.$inferSelect;
export type NewDbSatellite = typeof satellites.$inferInsert;
