import { Module } from '@nestjs/common';
import { SatellitesController } from './satellites.controller';
import { SatellitesService } from './satellites.service';

@Module({
  controllers: [SatellitesController],
  providers:   [SatellitesService],
})
export class SatellitesModule {}
