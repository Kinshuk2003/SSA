import { Controller, Get, Post, Query, NotFoundException } from '@nestjs/common';
import type { SyncStatus } from '@ssa/shared';
import { SyncService } from './sync.service';

@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Get('status')
  async getStatus(): Promise<SyncStatus> {
    const status = await this.syncService.getStatus();
    if (!status) throw new NotFoundException('No sync run has been recorded yet');
    return status;
  }


  @Post('trigger')
  triggerSync(@Query('force') force?: string): Promise<{ jobId: string }> {
    return this.syncService.triggerSync(force === 'true');
  }
}