import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Permission } from '@workshop/shared';
import { InvoicesService } from './invoices.service';
import { CreditNoteDto, IssueInvoiceDto, RecordPaymentDto } from './dto/invoice.dto';
import { PermissionsGuard, RequirePermissions } from '../../auth/permissions.guard';
import { Module } from '@nestjs/common';
import { InvoicesRepository } from './invoices.repository';

@Controller('invoices')
@UseGuards(PermissionsGuard)
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Post('issue')
  @RequirePermissions(Permission.InvoiceIssue)
  issue(@Body() dto: IssueInvoiceDto) {
    return this.invoices.issueFromWorkOrder(dto);
  }

  @Post('credit-note')
  @RequirePermissions(Permission.InvoiceIssue)
  credit(@Body() dto: CreditNoteDto) {
    return this.invoices.createCreditNote(dto);
  }

  @Post('payments')
  @RequirePermissions(Permission.InvoiceIssue)
  pay(@Body() dto: RecordPaymentDto) {
    return this.invoices.recordPayment(dto);
  }

  @Get()
  @RequirePermissions(Permission.AnalyticsFinancialView)
  list(@Query('customerId') customerId?: string) {
    return this.invoices.listByCustomer(customerId);
  }

  @Get(':id')
  @RequirePermissions(Permission.AnalyticsFinancialView)
  get(@Param('id') id: string) {
    return this.invoices.get(id);
  }
}

@Module({
  controllers: [InvoicesController],
  providers: [InvoicesService, InvoicesRepository],
  exports: [InvoicesService, InvoicesRepository],
})
export class InvoicesModule {}
