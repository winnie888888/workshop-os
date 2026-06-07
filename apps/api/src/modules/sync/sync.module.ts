import { Module } from '@nestjs/common';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { WorkOrdersModule } from '../workorders/work-orders.module';

@Module({
  imports: [WorkOrdersModule],
  controllers: [SyncController],
  providers: [SyncService],
})
export class SyncModule {}
