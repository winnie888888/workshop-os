import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Permission } from '@workshop/shared';
import { FleetsService } from './fleets.service';
import { CreateFleetDto } from './dto/fleet.dto';
import { PermissionsGuard, RequirePermissions } from '../../auth/permissions.guard';

@Controller('fleets')
@UseGuards(PermissionsGuard)
export class FleetsController {
  constructor(private readonly fleets: FleetsService) {}

  @Post()
  @RequirePermissions(Permission.CustomerManage)
  create(@Body() dto: CreateFleetDto) {
    return this.fleets.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.fleets.findById(id);
  }

  @Get()
  list(@Query('customerId') customerId: string) {
    return this.fleets.listByCustomer(customerId);
  }
}
