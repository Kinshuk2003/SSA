import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { SyncOrchestratorService } from './sync.orchestrator.service';
import { SYNC_QUEUE_NAME, type SyncJobPayload } from './sync.constants';

// receives one job from the queue and delegates the entire pipeline to SyncOrchestratorService.
// If process() throws, BullMQ marks the job as failed and respects the configured attempts / backoff policy on the queue.
@Processor(SYNC_QUEUE_NAME)
export class SyncJobProcessor extends WorkerHost {
  constructor(private readonly orchestrator: SyncOrchestratorService) {
    super();
  }

  async process(job: Job<SyncJobPayload>): Promise<void> {
    const scheduledAt = new Date(job.data.scheduledAt);
    console.log(`[SyncJobProcessor] processing job id=${job.id} scheduledAt=${job.data.scheduledAt}`);
    await this.orchestrator.run(scheduledAt);
  }
}
