import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Permission } from '@workshop/shared';
import { AssetsService } from './assets.service';
import { CreateAssetDto, LinkTrailerDto } from './dto/asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { PermissionsGuard, RequirePermissions } from '../../auth/permissions.guard';

@Controller('assets')
@UseGuards(PermissionsGuard)
export class AssetsController {
  constructor(private readonly assets: AssetsService) {}

  @Post()
  @RequirePermissions(Permission.CustomerManage)
  create(@Body() dto: CreateAssetDto) {
    return this.assets.create(dto);
  }

  // Edit a vehicle's descriptive fields (Phase 4B).
  @Patch(':id')
  @RequirePermissions(Permission.CustomerManage)
  update(@Param('id') id: string, @Body() dto: UpdateAssetDto) {
    return this.assets.update(id, dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assets.findById(id);
  }

  @Get()
  list(@Query('customerId') customerId: string) {
    return this.assets.listByCustomer(customerId);
  }

  @Post(':id/trailer')
  @RequirePermissions(Permission.CustomerManage)
  linkTrailer(@Param('id') tractorId: string, @Body() dto: LinkTrailerDto) {
    return this.assets.linkTrailer(tractorId, dto);
  }
}
