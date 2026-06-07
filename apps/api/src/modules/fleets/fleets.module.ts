import { Module } from '@nestjs/common';
import { FleetsController } from './fleets.controller';
import { FleetsService } from './fleets.service';
import { FleetsRepository } from './fleets.repository';

@Module({
  controllers: [FleetsController],
  providers: [FleetsService, FleetsRepository],
  exports: [FleetsService, FleetsRepository],
})
export class FleetsModule {}
