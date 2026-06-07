import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Permission } from '@workshop/shared';
import { PermissionsGuard, RequirePermissions } from '../../auth/permissions.guard';
import { WorkshopManagerService } from './workshop-manager.service';

/**
 * AI Workshop Manager — advisory insights for owners and managers.
 *
 * Notice the shape of this controller: every endpoint is a GET. There is no
 * POST, PATCH, or DELETE anywhere in this module, so even at the HTTP surface
 * there is no way to ask the manager to DO anything — only to SHOW what it found.
 * That is the advisory-only guarantee made visible. Gated on the existing
 * AnalyticsFinancialView permission (held by owners, admins, and accountants).
 */
@Controller('manager')
@UseGuards(PermissionsGuard)
export class WorkshopManagerController {
  constructor(private readonly manager: WorkshopManagerService) {}

  /** Owner dashboard insights over a window (default 30 days, clamped 1..90). */
  @Get('dashboard')
  @RequirePermissions(Permission.AnalyticsFinancialView)
  async dashboard(@Query('windowDays') windowDays?: string) {
    const n = Math.max(1, Math.min(90, Number(windowDays) || 30));
    return this.manager.dashboard(n);
  }

  /** Daily workshop summary. */
  @Get('daily')
  @RequirePermissions(Permission.AnalyticsFinancialView)
  async daily() {
    return this.manager.daily();
  }

  /** Weekly workshop summary. */
  @Get('weekly')
  @RequirePermissions(Permission.AnalyticsFinancialView)
  async weekly() {
    return this.manager.weekly();
  }
}
