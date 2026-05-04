import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  NotFoundException,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { z } from 'zod';
import { SatelliteQuerySchema, type Satellite, type SatelliteQuery, type PaginatedResponse } from '@ssa/shared';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { SatellitesService } from './satellites.service';

const CreateSatelliteBodySchema = z.object({
  norad_cat_id: z.coerce.number().int().positive(),
  object_name:  z.string().trim().min(1),
  object_id:    z.string().trim().min(1),
  object_type:  z.enum(['PAY', 'R/B', 'DEB', 'UNK']),
  ops_status:   z.enum(['+', '-', 'P', 'N', 'B', 'S', 'X', 'D']).nullable().default(null),
  owner:        z.string().trim().min(1).nullable().default(null),
  launch_date:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null),
  decay_date:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null),
  period:       z.number().nullable().default(null),
  inclination:  z.number().nullable().default(null),
  apogee:       z.number().int().nullable().default(null),
  perigee:      z.number().int().nullable().default(null),
});

type CreateSatelliteBody = z.infer<typeof CreateSatelliteBodySchema>;

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

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body(new ZodValidationPipe(CreateSatelliteBodySchema))
    body: CreateSatelliteBody,
  ): Promise<Satellite> {
    return this.satellitesService.create(body);
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
