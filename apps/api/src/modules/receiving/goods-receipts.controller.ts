import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Permission } from '@workshop/shared';
import { GoodsReceiptsService } from './goods-receipts.service';
import { CreateGrnDto } from './dto/goods-receipt.dto';
import { PermissionsGuard, RequirePermissions } from '../../auth/permissions.guard';

/**
 * Goods receipts. Creating a draft and posting it both require StockReceive (the
 * warehouse clerk). Posting is a separate action from create on purpose: it is
 * the moment stock moves, and keeping it explicit is what makes the OCR pipeline
 * safe — an OCR draft sits here until a human posts it.
 */
@Controller('goods-receipts')
@UseGuards(PermissionsGuard)
export class GoodsReceiptsController {
  constructor(private readonly grn: GoodsReceiptsService) {}

  @Get()
  list(@Query('status') status?: string, @Query('limit') limit?: string) {
    return this.grn.list({ status, limit: limit ? parseInt(limit, 10) : undefined });
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.grn.detail(id);
  }

  @Post()
  @RequirePermissions(Permission.StockReceive)
  createDraft(@Body() dto: CreateGrnDto) {
    return this.grn.createDraft(dto);
  }

  @Post(':id/post')
  @RequirePermissions(Permission.StockReceive)
  post(@Param('id') id: string) {
    return this.grn.post(id);
  }
}
