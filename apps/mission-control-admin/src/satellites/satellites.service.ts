import { Injectable, Inject } from '@nestjs/common';
import { createHash } from 'crypto';
import { SATELLITE_REPOSITORY, type ISatelliteRepository } from '@ssa/db';
import type { Satellite, SatelliteQuery, SatelliteRow, SatelliteUpsertRow, PaginatedResponse } from '@ssa/shared';

export interface CreateSatelliteData {
  norad_cat_id: number;
  object_name:  string;
  object_id:    string;
  object_type:  'PAY' | 'R/B' | 'DEB' | 'UNK';
  ops_status:   string | null;
  owner:        string | null;
  launch_date:  string | null;
  decay_date:   string | null;
  period:       number | null;
  inclination:  number | null;
  apogee:       number | null;
  perigee:      number | null;
}

@Injectable()
export class SatellitesService {
  constructor(
    @Inject(SATELLITE_REPOSITORY)
    private readonly repo: ISatelliteRepository,
  ) {}

  findMany(query: SatelliteQuery): Promise<PaginatedResponse<Satellite>> {
    return this.repo.findMany(query);
  }

  findOne(id: number): Promise<Satellite | null> {
    return this.repo.findByNoradId(id);
  }

  async create(data: CreateSatelliteData): Promise<Satellite> {
    const row: SatelliteRow = {
      norad_cat_id:     data.norad_cat_id,
      object_name:      data.object_name,
      object_id:        data.object_id,
      object_type:      data.object_type,
      ops_status:       (data.ops_status ?? null) as SatelliteRow['ops_status'],
      owner:            data.owner,
      launch_site:      null,
      launch_date:      data.launch_date,
      decay_date:       data.decay_date,
      period:           data.period,
      inclination:      data.inclination,
      apogee:           data.apogee,
      perigee:          data.perigee,
      rcs:              null,
      data_status_code: null,
      orbit_center:     null,
      orbit_type:       null,
    };

    const content_hash = createHash('sha256')
      .update(JSON.stringify({
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
      }))
      .digest('hex');

    const upsertRow: SatelliteUpsertRow = { ...row, content_hash };
    await this.repo.upsertMany([upsertRow]);
    return (await this.repo.findByNoradId(data.norad_cat_id))!;
  }
}
