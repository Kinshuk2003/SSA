import { z } from 'zod';

const csvNullStr = z.preprocess(
  (v) => (v == null || v === '' ? null : String(v).trim()),
  z.string().nullable(),
);


const csvNullNum = z.preprocess(
  (v) => (v == null || v === '' ? null : v),
  z.coerce.number().nullable(),
);

const csvNullInt = z.preprocess(
  (v) => (v == null || v === '' ? null : v),
  z.coerce.number().int().nullable(),
);


const csvNullDate = z.preprocess(
  (v) => (v == null || v === '' ? null : String(v).trim()),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD date format')
    .nullable(),
);


export const ObjectTypeSchema = z.enum(['PAY', 'R/B', 'DEB', 'UNK']);
export const OpsStatusSchema  = z.enum(['+', '-', 'P', 'N', 'B', 'S', 'X', 'D']);
export const OrbitTypeSchema  = z.enum(['ORB', 'IMP', 'LAN', 'DOC']);
export const RcsSchema        = z.enum(['S', 'M', 'L']);

export type ObjectType = z.infer<typeof ObjectTypeSchema>;
export type OpsStatus  = z.infer<typeof OpsStatusSchema>;
export type OrbitType  = z.infer<typeof OrbitTypeSchema>;
export type Rcs        = z.infer<typeof RcsSchema>;


export const SatelliteRowSchema = z.object({
  norad_cat_id:     z.coerce.number().int().positive(),
  object_name:      z.string().trim().min(1),
  object_id:        z.string().trim(),
  object_type:      ObjectTypeSchema,
  ops_status: z.preprocess(
    (v) => {
      if (v == null || String(v).trim() === '') return null;
      const s = String(v).trim();
      return s === 'p' ? 'P' : s;
    },
    OpsStatusSchema.nullable(),
  ),
  owner:            csvNullStr,
  launch_site:      csvNullStr,
  launch_date:      csvNullDate,
  decay_date:       csvNullDate,
  period:           csvNullNum,
  inclination:      csvNullNum,
  apogee:           csvNullInt,
  perigee:          csvNullInt,
  rcs: z.preprocess(
    (v) => (v == null || v === '' ? null : String(v).trim()),
    z.string().nullable(),
  ),
  data_status_code: csvNullStr,
  orbit_center:     csvNullStr,
  orbit_type: z.preprocess(
    (v) => (v == null || v === '' ? null : v),
    OrbitTypeSchema.nullable(),
  ),
});

export type SatelliteRow = z.infer<typeof SatelliteRowSchema>;


export const SatelliteUpsertRowSchema = SatelliteRowSchema.extend({
  content_hash: z.string().length(64, 'SHA-256 hex digest must be exactly 64 characters'),
});

export type SatelliteUpsertRow = z.infer<typeof SatelliteUpsertRowSchema>;


export const SatelliteSchema = SatelliteUpsertRowSchema.extend({
  created_at: z.string(), // ISO 8601 UTC — set on first INSERT, never changed
  updated_at: z.string(), // ISO 8601 UTC — set only when content_hash changes
});

export type Satellite = z.infer<typeof SatelliteSchema>;


export const SortableFieldSchema = z.enum([
  'norad_cat_id',
  'object_name',
  'launch_date',
  'period',
  'inclination',
  'apogee',
  'perigee',
]);

export type SortableField = z.infer<typeof SortableFieldSchema>;

export const SatelliteQuerySchema = z.object({
  search:      z.string().trim().min(1).optional(),
  object_type: ObjectTypeSchema.optional(),
  ops_status:  OpsStatusSchema.optional(),
  owner:       z.string().trim().min(1).optional(),
  orbit_type:  OrbitTypeSchema.optional(),
  sort_by:     SortableFieldSchema.optional().default('norad_cat_id'),
  sort_order:  z.enum(['asc', 'desc']).optional().default('asc'),
  cursor:      z.string().optional(),
  limit:       z.coerce.number().int().min(1).max(200).optional().default(50),
});

export type SatelliteQuery = z.infer<typeof SatelliteQuerySchema>;
