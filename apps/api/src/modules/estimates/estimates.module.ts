import { Body, Controller, Get, Module, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { IsArray, IsIn, IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { Permission } from '@workshop/shared';
import { PermissionsGuard, RequirePermissions } from '../../auth/permissions.guard';
import { InvoicesModule } from '../invoices/invoices.module';
import { EstimatesService } from './estimates.service';

/**
 * Estimates (quotes) — the priced offer before work is committed. Route shapes
 * mirror the demo contract exactly, so the existing screens (quotes list,
 * detail, new, print, customer cross-links) work unchanged against the real
 * stack. Conversion to an invoice is additionally gated by InvoiceIssue,
 * because that endpoint mints a legal document through the invoice engine.
 */

class CreateEstimateDto {
  @IsUUID() customerId!: string;
  @IsOptional() @IsUUID() vehicleId?: string;
  @IsOptional() @IsUUID() workOrderId?: string;
  @IsOptional() @IsArray() lines?: unknown[];
  @IsOptional() @IsString() @Length(10, 10) validUntil?: string; // YYYY-MM-DD
}

class UpdateEstimateDto {
  @IsOptional() @IsUUID() customerId?: string;
  @IsOptional() @IsUUID() vehicleId?: string;
  @IsOptional() @IsUUID() workOrderId?: string;
  @IsOptional() @IsArray() lines?: unknown[];
  @IsOptional() @IsString() @Length(10, 10) validUntil?: string;
  @IsOptional() @IsIn(['draft', 'sent', 'accepted', 'rejected', 'invoiced']) status?: string;
}

class SetEstimateStatusDto {
  @IsIn(['draft', 'sent', 'accepted', 'rejected', 'invoiced']) status!: string;
}

@Controller('estimates')
@UseGuards(PermissionsGuard)
export class EstimatesController {
  constructor(private readonly estimates: EstimatesService) {}

  @Post()
  @RequirePermissions(Permission.EstimateManage)
  create(@Body() dto: CreateEstimateDto) {
    return this.estimates.create(dto);
  }

  @Patch(':id')
  @RequirePermissions(Permission.EstimateManage)
  update(@Param('id') id: string, @Body() dto: UpdateEstimateDto) {
    return this.estimates.update(id, dto);
  }

  @Post(':id/status')
  @RequirePermissions(Permission.EstimateManage)
  setStatus(@Param('id') id: string, @Body() dto: SetEstimateStatusDto) {
    return this.estimates.setStatus(id, dto.status);
  }

  // Minting a legal invoice from the quote — gated like every other issuance.
  @Post(':id/to-invoice')
  @RequirePermissions(Permission.InvoiceIssue)
  toInvoice(@Param('id') id: string) {
    return this.estimates.toInvoice(id);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.estimates.get(id);
  }

  @Get()
  list(@Query('customerId') customerId?: string) {
    return this.estimates.list(customerId);
  }
}

@Module({
  imports: [InvoicesModule], // to-invoice reuses the existing invoice engine
  controllers: [EstimatesController],
  providers: [EstimatesService],
  exports: [EstimatesService],
})
export class EstimatesModule {}
