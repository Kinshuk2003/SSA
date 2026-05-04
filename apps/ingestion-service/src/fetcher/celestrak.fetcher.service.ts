import { Injectable } from '@nestjs/common';
import * as Papa from 'papaparse';
import { SatelliteRowSchema, type SatelliteUpsertRow } from '@ssa/shared';
import { computeContentHash } from '../common/hash.util';

const HEADER_MAP: Record<string, string> = {
  OBJECT_NAME:      'object_name',
  OBJECT_ID:        'object_id',
  NORAD_CAT_ID:     'norad_cat_id',
  OBJECT_TYPE:      'object_type',
  OPS_STATUS_CODE:  'ops_status',
  OWNER:            'owner',
  LAUNCH_SITE:      'launch_site',
  LAUNCH_DATE:      'launch_date',
  DECAY_DATE:       'decay_date',
  PERIOD:           'period',
  INCLINATION:      'inclination',
  APOGEE:           'apogee',
  PERIGEE:          'perigee',
  RCS:              'rcs',
  DATA_STATUS_CODE: 'data_status_code',
  ORBIT_CENTER:     'orbit_center',
  ORBIT_TYPE:       'orbit_type',
};

export interface FetchResult {
  rows:        SatelliteUpsertRow[];
  failedCount: number; // rows that failed SatelliteRowSchema validation
}

@Injectable()
export class CelesTrakFetcherService {
  /**
   * Download the SATCAT CSV, parse every row through SatelliteRowSchema,
   * compute a SHA-256 content_hash for each valid row, and return the results.
   *
   * Invalid rows are counted but not thrown — ingestion continues so one
   * malformed row does not abort the entire daily sync. The failedCount is
   * written to sync_jobs.records_failed so the failure is visible on the
   * dashboard without stopping the pipeline.
   */
  async fetchAll(): Promise<FetchResult> {
    const url = process.env['CELESTRAK_URL'] ?? 'https://celestrak.org/pub/satcat.csv';

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `CelesTrak fetch failed: HTTP ${response.status} ${response.statusText}`,
      );
    }

    const text = await response.text();

    const parsed = Papa.parse<Record<string, string>>(text, {
      header:         true,
      skipEmptyLines: true,
      transformHeader: (h: string) => HEADER_MAP[h.trim()] ?? h.trim().toLowerCase(),
    });

    if (parsed.errors.length > 0) {
      console.warn(
        `[CelesTrakFetcher] ${parsed.errors.length} CSV parse warnings`,
        parsed.errors.slice(0, 3),
      );
    }

    const rows: SatelliteUpsertRow[] = [];
    let failedCount = 0;

    for (const raw of parsed.data) {
      const result = SatelliteRowSchema.safeParse(raw);
      if (!result.success) {
        failedCount++;
        continue;
      }
      rows.push({
        ...result.data,
        content_hash: computeContentHash(result.data),
      });
    }

    console.log(
      `[CelesTrakFetcher] parsed ${rows.length} valid rows, ${failedCount} failed`,
    );

    return { rows, failedCount };
  }
}
