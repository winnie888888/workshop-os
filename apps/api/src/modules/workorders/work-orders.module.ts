import { Module } from '@nestjs/common';
import { WorkOrdersController } from './work-orders.controller';
import { WorkOrdersService } from './work-orders.service';
import { WorkOrdersRepository } from './work-orders.repository';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [InventoryModule],
  controllers: [WorkOrdersController],
  providers: [WorkOrdersService, WorkOrdersRepository],
  exports: [WorkOrdersService, WorkOrdersRepository],
})
export class WorkOrdersModule {}
