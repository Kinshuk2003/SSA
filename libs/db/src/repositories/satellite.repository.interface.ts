import type { Satellite, SatelliteQuery, SatelliteUpsertRow, PaginatedResponse } from '@ssa/shared';

export interface UpsertStats {
  upserted: number; 
  skipped:  number;
}


export interface ChangeLogEntry {
  norad_cat_id:   number;
  sync_job_id:    number;
  changed_fields: string[];
  old_values:     Record<string, unknown>;
  new_values:     Record<string, unknown>;
}


export interface ISatelliteRepository {
  findMany(query: SatelliteQuery): Promise<PaginatedResponse<Satellite>>;

  findByNoradId(id: number): Promise<Satellite | null>;

  upsertMany(rows: SatelliteUpsertRow[]): Promise<UpsertStats>;

  bulkFetchHashes(ids: number[]): Promise<Map<number, string>>;

  findManyByNoradIds(ids: number[]): Promise<Satellite[]>;

  insertChangeLogs(entries: ChangeLogEntry[]): Promise<void>;
}

export const SATELLITE_REPOSITORY = Symbol('ISatelliteRepository');
