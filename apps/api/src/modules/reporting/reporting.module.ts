import { Controller, Get, Module, Param, Query, UseGuards } from '@nestjs/common';
import { Permission } from '@workshop/shared';
import { PermissionsGuard, RequirePermissions } from '../../auth/permissions.guard';
import { AiModule } from '../../ai/ai-gateway.module';
import { ReportingService } from './reporting.service';
import { InsightsService } from './insights.service';

@Controller('reports')
@UseGuards(PermissionsGuard)
export class ReportingController {
  constructor(
    private readonly reports: ReportingService,
    private readonly insights: InsightsService,
  ) {}

  @Get('vat')
  @RequirePermissions(Permission.AnalyticsFinancialView)
  vat(@Query('from') from: string, @Query('to') to: string) {
    return this.reports.vatReport(from, to);
  }

  @Get('ar-aging')
  @RequirePermissions(Permission.AnalyticsFinancialView)
  aging(@Query('asOf') asOf?: string) {
    return this.reports.arAging(asOf);
  }

  @Get('revenue')
  @RequirePermissions(Permission.AnalyticsFinancialView)
  revenue(@Query('from') from: string, @Query('to') to: string) {
    return this.reports.revenue(from, to);
  }

  /** Owner's clocked-vs-standard-vs-billed + profitability picture for a job. */
  @Get('work-orders/:id/labour')
  @RequirePermissions(Permission.AnalyticsFinancialView)
  labour(@Param('id') id: string) {
    return this.insights.workOrderLabour(id);
  }

  /** Same picture plus an AI explanation of any anomalies (human-in-the-loop). */
  @Get('work-orders/:id/insights')
  @RequirePermissions(Permission.AnalyticsFinancialView)
  insightsFor(@Param('id') id: string) {
    return this.insights.explainWorkOrder(id);
  }
}

@Module({
  imports: [AiModule],
  controllers: [ReportingController],
  providers: [ReportingService, InsightsService],
  exports: [ReportingService, InsightsService],
})
export class ReportingModule {}
