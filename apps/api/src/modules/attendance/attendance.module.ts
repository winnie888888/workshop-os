import { Module } from '@nestjs/common';
import { AiModule } from '../../ai/ai-gateway.module';
import { AttendanceController, AttendanceAdminController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { TravelService } from './travel.service';
import { TimesheetService } from './timesheet.service';
import { AttendanceRepository } from './attendance.repository';

/**
 * Employee Time & Attendance (Phase 9). Composes the three services and the one
 * data accessor that make up the module:
 *   - AttendanceService : clock in/out, breaks, audited corrections, leave.
 *   - TravelService     : service vehicles, travel orders, field-service events.
 *   - TimesheetService  : monthly roll-up, accountant CSV export, AI consistency.
 *
 * AiModule is imported because the consistency check asks the gateway for a
 * best-effort narrative around deterministically-computed numbers (flag-only,
 * never an edit). PgService, AuditService and CounterService come from the
 * global CommonModule, so they need no import here. Two controllers: employee
 * self-service (clock yourself, your own leave/travel/timesheet — no special
 * permission) and management (corrections, leave decisions, service vehicles,
 * exports, consistency — each behind a permission).
 */
@Module({
  imports: [AiModule],
  controllers: [AttendanceController, AttendanceAdminController],
  providers: [AttendanceService, TravelService, TimesheetService, AttendanceRepository],
  exports: [AttendanceService, TravelService, TimesheetService],
})
export class AttendanceModule {}
