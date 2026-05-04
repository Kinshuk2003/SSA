import { Module } from '@nestjs/common';
import { CelesTrakFetcherService } from './celestrak.fetcher.service';

@Module({
  providers: [CelesTrakFetcherService],
  exports:   [CelesTrakFetcherService],
})
export class FetcherModule {}
