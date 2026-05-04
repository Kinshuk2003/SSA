import { Injectable, Inject } from '@nestjs/common';
import { SATELLITE_REPOSITORY, type ISatelliteRepository } from '@ssa/db';
import type { Satellite, SatelliteQuery, PaginatedResponse } from '@ssa/shared';

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
}
