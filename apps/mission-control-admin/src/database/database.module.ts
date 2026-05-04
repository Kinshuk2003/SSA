import { Global, Module, Injectable, OnApplicationShutdown, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import {
  createPool,
  createDb,
  SatelliteRepository,
  SyncJobRepository,
  SATELLITE_REPOSITORY,
  SYNC_JOB_REPOSITORY,
  type Db,
} from '@ssa/db';


const POOL_TOKEN = Symbol('Pool');
const DB_TOKEN   = Symbol('Db');


@Injectable()
class DatabaseShutdownService implements OnApplicationShutdown {
  constructor(@Inject(POOL_TOKEN) private readonly pool: Pool) {}

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}


// @Global() — registered once in AppModule; all feature modules can inject SATELLITE_REPOSITORY / SYNC_JOB_REPOSITORY without importing DatabaseModule themselves.
@Global()
@Module({
  providers: [
    {
      provide: POOL_TOKEN,
      useFactory: (): Pool => {
        const url = process.env['DATABASE_URL'];
        if (!url) throw new Error('DATABASE_URL environment variable is not set');
        return createPool(url);
      },
    },
    {
      provide: DB_TOKEN,
      useFactory: (pool: Pool): Db => createDb(pool),
      inject: [POOL_TOKEN],
    },
    {
      provide:    SATELLITE_REPOSITORY,
      useFactory: (db: Db) => new SatelliteRepository(db),
      inject:     [DB_TOKEN],
    },
    {
      provide:    SYNC_JOB_REPOSITORY,
      useFactory: (db: Db) => new SyncJobRepository(db),
      inject:     [DB_TOKEN],
    },
    DatabaseShutdownService,
  ],
  exports: [SATELLITE_REPOSITORY, SYNC_JOB_REPOSITORY],
})
export class DatabaseModule {}
