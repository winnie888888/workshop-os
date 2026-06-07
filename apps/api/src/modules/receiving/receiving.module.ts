import { Module } from '@nestjs/common';
import { GoodsReceiptsController } from './goods-receipts.controller';
import { GoodsReceiptsService } from './goods-receipts.service';
import { GoodsReceiptsRepository } from './goods-receipts.repository';
import { InventoryModule } from '../inventory/inventory.module';
import { PurchasingModule } from '../purchasing/purchasing.module';

/**
 * Receiving depends on Inventory (the costed-receive chokepoint) and Purchasing
 * (to advance PO lines on receipt). Both export the providers it needs, so this
 * module just imports them — no logic is duplicated.
 */
@Module({
  imports: [InventoryModule, PurchasingModule],
  controllers: [GoodsReceiptsController],
  providers: [GoodsReceiptsService, GoodsReceiptsRepository],
  exports: [GoodsReceiptsService],
})
export class ReceivingModule {}
