import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
  ParseIntPipe,
} from '@nestjs/common';
import { SatelliteQuerySchema, type Satellite, type SatelliteQuery, type PaginatedResponse } from '@ssa/shared';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { SatellitesService } from './satellites.service';

@Controller('satellites')
export class SatellitesController {
  constructor(private readonly satellitesService: SatellitesService) {}

  @Get()
  findMany(
    @Query(new ZodValidationPipe(SatelliteQuerySchema))
    query: SatelliteQuery,
  ): Promise<PaginatedResponse<Satellite>> {
    return this.satellitesService.findMany(query);
  }


  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Satellite> {
    const satellite = await this.satellitesService.findOne(id);
    if (!satellite) {
      throw new NotFoundException(`Satellite with NORAD ID ${id} not found`);
    }
    return satellite;
  }
}
