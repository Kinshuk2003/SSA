import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from './database/database.module';
import { SatellitesModule } from './satellites/satellites.module';
import { SyncModule } from './sync/sync.module';

function getRedisConfig(): { host: string; port: number } {
  const url = new URL(process.env['REDIS_URL'] ?? 'redis://localhost:6379');
  return { host: url.hostname, port: parseInt(url.port || '6379', 10) };
}

@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: () => ({ connection: getRedisConfig() }),
    }),
    DatabaseModule,
    SatellitesModule,
    SyncModule,
  ],
})
export class AppModule {}
