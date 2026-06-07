import { Controller, Get, Module, Query, UseGuards } from '@nestjs/common';
import { Permission } from '@workshop/shared';
import { SearchService } from './search.service';
import { PermissionsGuard, RequirePermissions } from '../../auth/permissions.guard';

/**
 * Global search route. Guarded by WorkOrderLineTime — the lowest staff bar that
 * advisors also hold — so it powers the advisor command bar while never leaking
 * data across tenants (every query runs under RLS in the service).
 */
@Controller('search')
@UseGuards(PermissionsGuard)
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get()
  @RequirePermissions(Permission.WorkOrderLineTime)
  run(@Query('q') q: string, @Query('limit') limit?: string) {
    return this.search.search(q ?? '', limit ? parseInt(limit, 10) : 10);
  }
}

@Module({
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
