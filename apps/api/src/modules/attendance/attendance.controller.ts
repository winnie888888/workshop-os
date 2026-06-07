import { Body, Controller, Get, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Length, Min } from 'class-validator';
import { Permission } from '@workshop/shared';
import { PermissionsGuard, RequirePermissions } from '../../auth/permissions.guard';
import { AttendanceService } from './attendance.service';
import { TravelService } from './travel.service';
import { TimesheetService } from './timesheet.service';

/* ----------------------------- DTOs ----------------------------- */

class LeaveRequestDto {
  @IsIn(['vacation', 'sick_leave', 'personal_leave', 'business_leave', 'public_holiday', 'planned_absence'])
  leaveType!: string;
  @IsString() startDate!: string;
  @IsString() endDate!: string;
  @IsOptional() @IsNumber() hoursPerDay?: number;
  @IsOptional() @IsString() reason?: string;
}
class CorrectDayDto {
  @IsOptional() @IsString() clockInAt?: string | null;
  @IsOptional() @IsString() clockOutAt?: string | null;
  @IsString() @Length(1, 500) note!: string;
}
class LeaveDecisionDto {
  @IsIn(['approved', 'rejected']) decision!: 'approved' | 'rejected';
  @IsOptional() @IsString() note?: string;
}
class CreateVehicleDto {
  @IsString() registrationNumber!: string;
  @IsOptional() @IsString() vin?: string;
  @IsOptional() @IsString() make?: string;
  @IsOptional() @IsString() model?: string;
  @IsOptional() @IsString() fuelType?: string;
  @IsOptional() @IsInt() @Min(0) currentMileageKm?: number;
  @IsOptional() @IsString() assignedUserId?: string;
  @IsOptional() @IsString() registrationExpiry?: string;
}
class CreateTravelOrderDto {
  @IsOptional() @IsString() userId?: string;
  @IsOptional() @IsString() serviceVehicleId?: string;
  @IsOptional() @IsString() customerId?: string;
  @IsOptional() @IsString() workOrderId?: string;
  @IsIn(['field_repair', 'field_repair_abroad', 'road_assistance', 'towing', 'parts_pickup', 'customer_visit'])
  purpose!: string;
  @IsOptional() @IsString() destination?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsInt() @Min(0) perKmRateMinor?: number;
}
class FinishTravelOrderDto {
  @IsOptional() @IsInt() @Min(0) travelSeconds?: number;
  @IsOptional() @IsInt() @Min(0) workSeconds?: number;
  @IsOptional() @IsInt() @Min(0) waitingSeconds?: number;
  @IsOptional() @IsNumber() km?: number;
  @IsOptional() @IsInt() @Min(0) expensesMinor?: number;
}

/* ----------------- Employee self-service controller -----------------
 * Any authenticated member may clock themselves and manage their own leave/
 * travel — no special permission is required to record one's own presence. */
@Controller('attendance')
@UseGuards(PermissionsGuard)
export class AttendanceController {
  constructor(
    private readonly attendance: AttendanceService,
    private readonly travel: TravelService,
    private readonly timesheets: TimesheetService,
  ) {}

  @Post('clock-in') clockIn() { return this.attendance.clockIn(); }
  @Post('clock-out') clockOut() { return this.attendance.clockOut(); }
  @Post('break/start') startBreak() { return this.attendance.startBreak(); }
  @Post('break/end') endBreak() { return this.attendance.endBreak(); }
  @Get('current') current() { return this.attendance.currentDay(); }

  @Post('leave') requestLeave(@Body() dto: LeaveRequestDto) { return this.attendance.requestLeave(dto); }
  @Get('leave/mine') myLeave(@Query('status') status?: string) { return this.attendance.myLeave(status); }

  @Get('vehicle/mine') myVehicle() { return this.travel.myVehicle(); }
  @Post('travel-orders') createTravelOrder(@Body() dto: CreateTravelOrderDto) { return this.travel.createTravelOrder(dto); }
  @Post('travel-orders/:id/start') startTravelOrder(@Param('id') id: string) { return this.travel.startTravelOrder(id); }
  @Post('travel-orders/:id/finish') finishTravelOrder(@Param('id') id: string, @Body() dto: FinishTravelOrderDto) {
    return this.travel.finishTravelOrder(id, dto);
  }
  @Get('travel-orders/mine') myTravelOrders() { return this.travel.myTravelOrders(); }
  @Post('field-service') recordFieldService(@Body() dto: any) { return this.travel.recordFieldService(dto); }

  /** My own monthly timesheet (employees may always see their own records). */
  @Get('timesheet/mine') myTimesheet(@Query('userId') userId: string, @Query('month') month: string) {
    return this.timesheets.monthly(userId, month);
  }
}

/* --------------------- Management controller ---------------------
 * Corrections, leave decisions, service vehicles, and exports are gated. */
@Controller('attendance-admin')
@UseGuards(PermissionsGuard)
export class AttendanceAdminController {
  constructor(
    private readonly attendance: AttendanceService,
    private readonly travel: TravelService,
    private readonly timesheets: TimesheetService,
  ) {}

  @Post('days/:id/correct')
  @RequirePermissions(Permission.AttendanceManage)
  correctDay(@Param('id') id: string, @Body() dto: CorrectDayDto) {
    return this.attendance.correctDay(id, { clockInAt: dto.clockInAt ?? null, clockOutAt: dto.clockOutAt ?? null, note: dto.note });
  }

  @Get('leave/pending')
  @RequirePermissions(Permission.LeaveApprove)
  pendingLeave() { return this.attendance.pendingLeave(); }

  @Post('leave/:id/decide')
  @RequirePermissions(Permission.LeaveApprove)
  decideLeave(@Param('id') id: string, @Body() dto: LeaveDecisionDto) {
    return this.attendance.decideLeave(id, dto.decision, dto.note);
  }

  @Get('service-vehicles')
  @RequirePermissions(Permission.TravelOrderManage)
  listVehicles() { return this.travel.listVehicles(); }

  @Post('service-vehicles')
  @RequirePermissions(Permission.TravelOrderManage)
  createVehicle(@Body() dto: CreateVehicleDto) { return this.travel.createVehicle(dto); }

  @Post('service-vehicles/:id/assign')
  @RequirePermissions(Permission.TravelOrderManage)
  assignVehicle(@Param('id') id: string, @Body() body: { userId: string | null }) {
    return this.travel.assignVehicle(id, body.userId ?? null);
  }

  @Get('timesheet')
  @RequirePermissions(Permission.PayrollExport)
  timesheet(@Query('userId') userId: string, @Query('month') month: string) {
    return this.timesheets.monthly(userId, month);
  }

  /** Accountant export (CSV download) — the "export/send to accountant" feature. */
  @Get('export')
  @RequirePermissions(Permission.PayrollExport)
  async export(@Query('userId') userId: string, @Query('month') month: string, @Res() res: Response) {
    const csv = await this.timesheets.exportCsv(userId, month);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="timesheet-${userId}-${month}.csv"`);
    res.end(csv);
  }

  /** AI consistency check (advisory only; never modifies records). */
  @Get('consistency')
  @RequirePermissions(Permission.AttendanceManage)
  consistency(@Query('userId') userId: string, @Query('from') from: string, @Query('to') to: string) {
    return this.timesheets.consistency(userId, from, to);
  }
}
