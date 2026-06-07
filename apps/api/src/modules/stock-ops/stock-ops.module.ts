import { Module } from '@nestjs/common';
import { StockOpsController } from './stock-ops.controller';
import { StockOpsService } from './stock-ops.service';
import { StockOpsRepository } from './stock-ops.repository';
import { InventoryModule } from '../inventory/inventory.module';

/**
 * Stock operations (adjustments + counting) lean on the Inventory chokepoint for
 * the actual ledger writes, so this module imports InventoryModule and adds only
 * the orchestration and audit on top.
 */
@Module({
  imports: [InventoryModule],
  controllers: [StockOpsController],
  providers: [StockOpsService, StockOpsRepository],
  exports: [StockOpsService],
})
export class StockOpsModule {}
