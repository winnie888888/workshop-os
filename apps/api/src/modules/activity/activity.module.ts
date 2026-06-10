import { Controller, Get, Module, Query, UseGuards } from '@nestjs/common';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { ActivityService } from './activity.service';

/**
 * GET /activity?limit=N — recent business activity for the dashboard, read
 * straight from the audit chain. Read-only and tenant-scoped; authenticated
 * access without a specific permission, same convention as other read
 * endpoints (the audit chain itself remains append-only and unexposed).
 */
@Controller('activity')
@UseGuards(PermissionsGuard)
export class ActivityController {
  constructor(private readonly activity: ActivityService) {}

  @Get()
  list(@Query('limit') limit = '30') {
    return this.activity.list(parseInt(limit, 10) || 30);
  }
}

@Module({
  controllers: [ActivityController],
  providers: [ActivityService],
  exports: [ActivityService],
})
export class ActivityModule {}
