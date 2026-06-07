import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Permission } from '@workshop/shared';
import { StockOpsService } from './stock-ops.service';
import { AdjustStockDto, OpenCountDto, RecordCountDto } from './dto/stock-ops.dto';
import { PermissionsGuard, RequirePermissions } from '../../auth/permissions.guard';

/**
 * Stock operations: standalone adjustments and stocktake counting. Both require
 * StockAdjust — the warehouse role's correction privilege — because both can
 * change recorded quantities and must be done by someone accountable for it.
 */
@Controller('stock-ops')
@UseGuards(PermissionsGuard)
export class StockOpsController {
  constructor(private readonly ops: StockOpsService) {}

  // --- adjustments ---
  @Post('adjustments')
  @RequirePermissions(Permission.StockAdjust)
  adjust(@Body() dto: AdjustStockDto) {
    return this.ops.adjust(dto);
  }

  // --- counts ---
  @Get('counts')
  listCounts(@Query('limit') limit?: string) {
    return this.ops.listCounts(limit ? parseInt(limit, 10) : undefined);
  }

  @Get('counts/:id')
  countDetail(@Param('id') id: string) {
    return this.ops.detail(id);
  }

  @Post('counts')
  @RequirePermissions(Permission.StockAdjust)
  openCount(@Body() dto: OpenCountDto) {
    return this.ops.openCount(dto);
  }

  @Post('counts/:id/record')
  @RequirePermissions(Permission.StockAdjust)
  record(@Param('id') id: string, @Body() dto: RecordCountDto) {
    return this.ops.recordCount(id, dto);
  }

  @Post('counts/:id/close')
  @RequirePermissions(Permission.StockAdjust)
  close(@Param('id') id: string) {
    return this.ops.closeCount(id);
  }
}
