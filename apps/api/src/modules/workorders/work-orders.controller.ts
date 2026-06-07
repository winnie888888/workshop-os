import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { IsInt, IsOptional, IsString, Length, Matches } from 'class-validator';
import { Permission } from '@workshop/shared';
import { WorkOrdersService } from './work-orders.service';
import { AddLineDto, ClockDto, CreateWorkOrderDto, TransitionDto } from './dto/work-order.dto';
import { PermissionsGuard, RequirePermissions } from '../../auth/permissions.guard';

// Assigning a mechanic carries just the assignee (null clears it).
class AssignDto {
  @IsOptional() @IsString() @Length(1, 36) mechanicId?: string;
}

// Patch one line. All fields optional; the service re-prices via the shared core.
class UpdateLineDto {
  @IsOptional() @IsString() @Length(1, 300) description?: string;
  @IsOptional() @Matches(/^-?\d+(\.\d{1,3})?$/, { message: 'quantity must be a decimal' }) quantity?: string;
  @IsOptional() @IsInt() unitPriceMinor?: number;
  @IsOptional() @Matches(/^\d+(\.\d{1,2})?$/) discountPct?: string;
  @IsOptional() @Matches(/^\d+(\.\d{1,2})?$/) vatRatePct?: string;
}

@Controller('work-orders')
@UseGuards(PermissionsGuard)
export class WorkOrdersController {
  constructor(private readonly wo: WorkOrdersService) {}

  // Board projection for the mechanic job list and advisor Today board.
  // statuses is a comma-separated list; mine=1 scopes to the caller's clock.
  @Get()
  @RequirePermissions(Permission.WorkOrderLineTime)
  list(
    @Query('statuses') statuses?: string,
    @Query('assignedMechanicId') assignedMechanicId?: string,
    @Query('clockedMechanicId') clockedMechanicId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.wo.list({
      statuses: statuses ? statuses.split(',').filter(Boolean) : undefined,
      assignedMechanicId,
      clockedMechanicId,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  // The tenant's assignable mechanics. NOTE: this STATIC route is declared
  // before the ':id' route below so Nest does not capture "mechanics" as an id.
  @Get('mechanics')
  @RequirePermissions(Permission.WorkOrderEdit)
  mechanics() {
    return this.wo.listMechanics();
  }

  @Post()
  @RequirePermissions(Permission.WorkOrderCreate)
  create(@Body() dto: CreateWorkOrderDto) {
    return this.wo.create(dto);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.wo.get(id);
  }

  @Get(':id/nalog')
  nalog(@Param('id') id: string) {
    return this.wo.nalog(id);
  }

  // Assign or clear the responsible mechanic (Phase 4B). This is what populates
  // a mechanic's "my jobs" list.
  @Post(':id/assign')
  @RequirePermissions(Permission.WorkOrderEdit)
  assign(@Param('id') id: string, @Body() dto: AssignDto) {
    return this.wo.assign(id, dto.mechanicId ?? null);
  }

  @Post(':id/lines')
  @RequirePermissions(Permission.WorkOrderEdit)
  addLine(@Param('id') id: string, @Body() dto: AddLineDto) {
    return this.wo.addLine(id, dto);
  }

  // Edit one line (Phase 4B): description, quantity, price, discount, VAT rate.
  @Patch(':id/lines/:lineId')
  @RequirePermissions(Permission.WorkOrderEdit)
  updateLine(@Param('id') id: string, @Param('lineId') lineId: string, @Body() dto: UpdateLineDto) {
    return this.wo.updateLine(id, lineId, dto);
  }

  // Remove a line (Phase 4B); releases any stock it had reserved.
  @Delete(':id/lines/:lineId')
  @RequirePermissions(Permission.WorkOrderEdit)
  removeLine(@Param('id') id: string, @Param('lineId') lineId: string) {
    return this.wo.removeLine(id, lineId);
  }

  @Post(':id/lines/:lineId/issue')
  @RequirePermissions(Permission.WorkOrderEdit)
  issueLine(@Param('id') id: string, @Param('lineId') lineId: string) {
    return this.wo.issueLine(id, lineId);
  }

  @Post(':id/transition')
  @RequirePermissions(Permission.WorkOrderEdit)
  transition(@Param('id') id: string, @Body() dto: TransitionDto) {
    return this.wo.transition(id, dto.to);
  }

  // Mechanics may clock on/off — the one work-order action their role allows.
  @Post(':id/clock-on')
  @RequirePermissions(Permission.WorkOrderLineTime)
  clockOn(@Param('id') id: string, @Body() dto: ClockDto) {
    return this.wo.clockOn(id, dto);
  }

  @Post(':id/clock-off')
  @RequirePermissions(Permission.WorkOrderLineTime)
  clockOff(@Param('id') id: string, @Body() dto: ClockDto) {
    return this.wo.clockOff(id, dto);
  }
}
