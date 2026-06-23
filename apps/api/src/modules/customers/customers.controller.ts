import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { IsIn, IsOptional, IsString, Length } from 'class-validator';
import { Permission } from '@workshop/shared';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { PermissionsGuard, RequirePermissions } from '../../auth/permissions.guard';

// VAT validation request: 'vies' for an authoritative check, 'manual' for an
// audited human attestation (which requires a note).
class ValidateVatDto {
  @IsIn(['vies', 'manual']) mode!: 'vies' | 'manual';
  @IsOptional() @IsString() @Length(3, 500) note?: string;
}

@Controller('customers')
@UseGuards(PermissionsGuard)
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Post()
  @RequirePermissions(Permission.CustomerManage)
  create(@Body() dto: CreateCustomerDto) {
    return this.customers.create(dto);
  }

  // Edit an existing customer (Phase 4B). Same permission as create; the
  // service re-validates invariants and re-syncs Minimax.
  @Patch(':id')
  @RequirePermissions(Permission.CustomerManage)
  update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customers.update(id, dto);
  }

  // Validate the customer's VAT id (Phase 4C) so EU reverse charge may apply.
  // mode 'vies' calls the EU service when configured; mode 'manual' records an
  // audited human attestation (note required). Every action is audit-logged.
  @Post(':id/validate-vat')
  @RequirePermissions(Permission.CustomerManage)
  validateVat(@Param('id') id: string, @Body() dto: ValidateVatDto) {
    return this.customers.validateVatId(id, { mode: dto.mode, note: dto.note });
  }

  // Pre-creation company lookup (Customer Creation spec): the advisor enters a
  // VAT id (EU → VIES) or a Slovenian registration number (→ AJPES/Bizi) and we
  // return registry data to auto-fill the form. Declared BEFORE ':id' so the
  // literal "lookup" segment is not matched as a customer id.
  @Get('lookup')
  @RequirePermissions(Permission.CustomerManage)
  lookup(
    @Query('vat') vat?: string,
    @Query('regNo') regNo?: string,
    @Query('country') country?: string,
  ) {
    return this.customers.lookupCompany({ vat, regNo, country });
  }

  /**
   * Branje ene stranke je NAMERNO dostopno vsakemu prijavljenemu članu delavnice
   * (brez @RequirePermissions). Varnostna meja med delavnicami je Postgres RLS:
   * findById vrne vrstico samo iz člankovega tenanta — stranke tuje delavnice
   * RLS ne pokaže. Znotraj ene (majhne, zaupanja vredne) delavnice pa mora
   * stranko videti vsakdo, ki dela na njenem nalogu (mehanik, skladiščnik), ne
   * le service advisor s CustomerManage. Ločena CustomerView pravica bi bila
   * smiselna šele pri večjih ekipah z oddelki; do takrat je to zavestna izbira,
   * ne pozabljen gate. Pisanje (Post/Patch) je seveda omejeno s CustomerManage.
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.customers.findById(id);
  }

  // Per-customer receivables aging (item 6) — powers the advisor's overdue
  // banner with a figure specific to THIS customer, not the shop-wide total.
  @Get(':id/receivables')
  @RequirePermissions(Permission.AnalyticsFinancialView)
  receivables(@Param('id') id: string, @Query('asOf') asOf?: string) {
    return this.customers.receivables(id, asOf);
  }

  @Get()
  async list(
    @Query('limit') limit = '50',
    @Query('afterName') afterName?: string,
    @Query('afterId') afterId?: string,
    @Query('q') q?: string,
  ) {
    const size = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
    const items = await this.customers.list(size, afterName, afterId, q);
    const last = items[items.length - 1];
    // A cursor only when the page came back full — a short page IS the end.
    const nextCursor = items.length === size && last ? { afterName: last.name, afterId: last.id } : null;
    return { items, nextCursor };
  }
}
