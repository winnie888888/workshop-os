import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Permission } from '@workshop/shared';
import { PurchaseOrdersService } from './purchase-orders.service';
import { CreatePoDto } from './dto/purchase-order.dto';
import { PermissionsGuard, RequirePermissions } from '../../auth/permissions.guard';

/**
 * Purchase orders. Reads are open to stock-viewers; all writes require
 * PurchaseManage. Sending and cancelling are explicit actions so the state
 * machine governs them, rather than a generic status PATCH.
 */
@Controller('purchase-orders')
@UseGuards(PermissionsGuard)
export class PurchaseOrdersController {
  constructor(private readonly po: PurchaseOrdersService) {}

  @Get()
  list(@Query('status') status?: string, @Query('supplierId') supplierId?: string, @Query('limit') limit?: string) {
    return this.po.list({ status, supplierId, limit: limit ? parseInt(limit, 10) : undefined });
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.po.detail(id);
  }

  @Post()
  @RequirePermissions(Permission.PurchaseManage)
  create(@Body() dto: CreatePoDto) {
    return this.po.create(dto);
  }

  @Post(':id/send')
  @RequirePermissions(Permission.PurchaseManage)
  send(@Param('id') id: string) {
    return this.po.send(id);
  }

  @Post(':id/cancel')
  @RequirePermissions(Permission.PurchaseManage)
  cancel(@Param('id') id: string) {
    return this.po.cancel(id);
  }
}
