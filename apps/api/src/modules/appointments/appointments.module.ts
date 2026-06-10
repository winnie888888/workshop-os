import { Body, Controller, Delete, Get, Module, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Length, Matches, Min } from 'class-validator';
import { Permission } from '@workshop/shared';
import { PermissionsGuard, RequirePermissions } from '../../auth/permissions.guard';
import { AppointmentsService } from './appointments.service';

/**
 * Appointments — the advisor's calendar. Route shapes mirror the demo contract
 * so the calendar, dashboard, and customer cross-links work unchanged against
 * the real stack. Bookings are wall-clock shop times (see service notes).
 */

const LOCAL_TS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;

class CreateAppointmentDto {
  @IsString() @Length(1, 200) title!: string;
  @Matches(LOCAL_TS, { message: 'start must be a local timestamp like 2026-06-12T08:00' }) start!: string;
  @IsOptional() @Matches(LOCAL_TS) end?: string;
  @IsOptional() @IsInt() @Min(0) durationMin?: number;
  @IsOptional() @IsUUID() customerId?: string;
  @IsOptional() @IsUUID() vehicleId?: string;
  @IsOptional() @IsUUID() workOrderId?: string;
  @IsOptional() @IsString() @Length(0, 2000) note?: string;
  @IsOptional() @IsIn(['scheduled', 'done', 'cancelled']) status?: string;
}

class UpdateAppointmentDto {
  @IsOptional() @IsString() @Length(1, 200) title?: string;
  @IsOptional() @Matches(LOCAL_TS) start?: string;
  @IsOptional() @Matches(LOCAL_TS) end?: string;
  @IsOptional() @IsInt() @Min(0) durationMin?: number;
  @IsOptional() @IsUUID() customerId?: string;
  @IsOptional() @IsUUID() vehicleId?: string;
  @IsOptional() @IsUUID() workOrderId?: string;
  @IsOptional() @IsString() @Length(0, 2000) note?: string;
  @IsOptional() @IsIn(['scheduled', 'done', 'cancelled']) status?: string;
}

@Controller('appointments')
@UseGuards(PermissionsGuard)
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Post()
  @RequirePermissions(Permission.AppointmentManage)
  create(@Body() dto: CreateAppointmentDto) {
    return this.appointments.create(dto);
  }

  @Patch(':id')
  @RequirePermissions(Permission.AppointmentManage)
  update(@Param('id') id: string, @Body() dto: UpdateAppointmentDto) {
    return this.appointments.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.AppointmentManage)
  remove(@Param('id') id: string) {
    return this.appointments.remove(id);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.appointments.get(id);
  }

  @Get()
  list(@Query('customerId') customerId?: string) {
    return this.appointments.list(customerId);
  }
}

@Module({
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
