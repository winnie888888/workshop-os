import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Permission } from '@workshop/shared';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto, UpdateSupplierDto, LinkSupplierItemDto } from './dto/supplier.dto';
import { PermissionsGuard, RequirePermissions } from '../../auth/permissions.guard';

/**
 * Suppliers + the supplier↔item catalogue. Reads are open to anyone who can see
 * stock; writes require PurchaseManage (the buyer/owner role), since suppliers
 * and their prices feed purchasing. Same guard pattern as every other module.
 */
@Controller('suppliers')
@UseGuards(PermissionsGuard)
export class SuppliersController {
  constructor(private readonly suppliers: SuppliersService) {}

  @Get()
  list(@Query('status') status?: string, @Query('limit') limit?: string) {
    return this.suppliers.list({ status, limit: limit ? parseInt(limit, 10) : undefined });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.suppliers.get(id);
  }

  @Post()
  @RequirePermissions(Permission.PurchaseManage)
  create(@Body() dto: CreateSupplierDto) {
    return this.suppliers.create(dto);
  }

  @Patch(':id')
  @RequirePermissions(Permission.PurchaseManage)
  update(@Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    return this.suppliers.update(id, dto);
  }

  // Link (or update the link to) a catalogue item this supplier provides.
  @Post(':id/items')
  @RequirePermissions(Permission.PurchaseManage)
  linkItem(@Param('id') id: string, @Body() dto: LinkSupplierItemDto) {
    return this.suppliers.linkItem(id, dto);
  }

  @Get(':id/items')
  items(@Param('id') id: string) {
    return this.suppliers.itemsForSupplier(id);
  }
}

/**
 * A small second controller so the catalogue can answer "who supplies this
 * item?" from the item's side (used by the reorder/suggested-PO flow).
 */
@Controller('inventory-items')
@UseGuards(PermissionsGuard)
export class ItemSuppliersController {
  constructor(private readonly suppliers: SuppliersService) {}

  @Get(':id/suppliers')
  suppliersForItem(@Param('id') id: string) {
    return this.suppliers.suppliersForItem(id);
  }
}
