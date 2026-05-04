import { createHash } from 'crypto';
import type { SatelliteRow } from '@ssa/shared';

// SHA-256 of a canonicalised JSON object built from every trackable field.

export function computeContentHash(row: SatelliteRow): string {
  const payload = {
    object_name:      row.object_name,
    object_id:        row.object_id,
    object_type:      row.object_type,
    ops_status:       row.ops_status,
    owner:            row.owner,
    launch_site:      row.launch_site,
    launch_date:      row.launch_date,
    decay_date:       row.decay_date,
    period:           row.period,
    inclination:      row.inclination,
    apogee:           row.apogee,
    perigee:          row.perigee,
    rcs:              row.rcs,
    data_status_code: row.data_status_code,
    orbit_center:     row.orbit_center,
    orbit_type:       row.orbit_type,
  };
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}
