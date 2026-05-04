import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { FetcherModule } from '../fetcher/fetcher.module';
import { SyncSchedulerService } from './sync.scheduler.service';
import { SyncOrchestratorService } from './sync.orchestrator.service';
import { SyncJobProcessor } from './sync.job.processor';
import { SYNC_QUEUE_NAME } from './sync.constants';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    BullModule.registerQueue({ name: SYNC_QUEUE_NAME }),
    FetcherModule,
  ],
  providers: [
    SyncSchedulerService,
    SyncOrchestratorService,
    SyncJobProcessor,
  ],
})
export class SyncModule {}
