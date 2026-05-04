import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'sync' }),
  ],
  controllers: [SyncController],
  providers:   [SyncService],
})
export class SyncModule {}