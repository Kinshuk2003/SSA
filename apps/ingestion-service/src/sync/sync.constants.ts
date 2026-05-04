export const SYNC_QUEUE_NAME = 'sync';

export interface SyncJobPayload {
  scheduledAt: string; // ISO 8601 UTC — today's midnight
}

export const TRACKED_FIELDS = [
  'object_name',
  'object_id',
  'object_type',
  'ops_status',
  'owner',
  'launch_site',
  'launch_date',
  'decay_date',
  'period',
  'inclination',
  'apogee',
  'perigee',
  'rcs',
  'data_status_code',
  'orbit_center',
  'orbit_type',
] as const;

export type TrackedField = (typeof TRACKED_FIELDS)[number];
