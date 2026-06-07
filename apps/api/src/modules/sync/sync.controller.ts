import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { Permission } from '@workshop/shared';
import { SyncService } from './sync.service';
import { SyncMutationsDto, SyncPullQuery } from './sync.dto';
import { PermissionsGuard, RequirePermissions } from '../../auth/permissions.guard';

@Controller('sync')
@UseGuards(PermissionsGuard)
export class SyncController {
  constructor(private readonly sync: SyncService) {}

  // The bay app pulls everything that changed since its last cursor.
  @Get('changes')
  @RequirePermissions(Permission.WorkOrderLineTime)
  changes(@Query() q: SyncPullQuery) {
    return this.sync.pull(q.since, q.limit ? parseInt(q.limit, 10) : 200);
  }

  // The bay app replays its offline mutation queue (idempotent).
  @Post('mutations')
  @RequirePermissions(Permission.WorkOrderLineTime)
  mutations(@Body() dto: SyncMutationsDto) {
    return this.sync.replay(dto.mutations);
  }
}
