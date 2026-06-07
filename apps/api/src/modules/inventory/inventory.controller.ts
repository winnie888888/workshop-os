import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Permission } from '@workshop/shared';
import { InventoryService } from './inventory.service';
import { CreateItemDto, ReceiveStockDto, TransferStockDto } from './dto/inventory.dto';
import { PermissionsGuard, RequirePermissions } from '../../auth/permissions.guard';

@Controller('inventory')
@UseGuards(PermissionsGuard)
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Post('items')
  @RequirePermissions(Permission.StockReceive)
  createItem(@Body() dto: CreateItemDto) {
    return this.inventory.createItem(dto);
  }

  @Post('receive')
  @RequirePermissions(Permission.StockReceive)
  receive(@Body() dto: ReceiveStockDto) {
    return this.inventory.receive(dto);
  }

  // Phase 5.0: move stock between two locations as an atomic transfer pair.
  @Post('transfer')
  @RequirePermissions(Permission.StockTransfer)
  transfer(@Body() dto: TransferStockDto) {
    return this.inventory.transfer({
      itemId: dto.itemId, fromLocationId: dto.fromLocationId,
      toLocationId: dto.toLocationId, qty: dto.quantity, reason: dto.reason ?? null,
    });
  }

  // Catalogue search for the advisor parts picker (Warehouse 5.1). Declared
  // before the ':id' route so 'items' with a query is not captured as an id.
  @Get('items')
  searchItems(@Query('q') q?: string, @Query('limit') limit?: string) {
    return this.inventory.searchItems(q, limit ? parseInt(limit, 10) : undefined);
  }

  @Get('items/:id/stock')
  stock(@Param('id') itemId: string) {
    return this.inventory.stockForItem(itemId);
  }
}
