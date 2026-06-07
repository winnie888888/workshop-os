import {
  Body, Controller, Get, Header, Param, Post, Query, Req, Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { IsIn, IsOptional, IsString, Length } from 'class-validator';
import { PortalAuthService } from './portal-auth.service';
import { PortalService } from './portal.service';
import { generateInvoicePdf } from './invoice-pdf';
import { PgService } from '../common/db/pg.service';
import { getContext } from '@workshop/shared';

// --- DTOs ---
class RequestLinkDto {
  @IsString() tenantId!: string;
  @IsString() @Length(3, 200) contact!: string;        // email or phone
  @IsIn(['sms', 'email']) channel!: 'sms' | 'email';
}
class VerifyDto { @IsString() token!: string; }
class RespondDto {
  @IsIn(['approved', 'declined']) decision!: 'approved' | 'declined';
  @IsOptional() @IsString() @Length(1, 500) note?: string;
}
class AppointmentDto {
  @IsOptional() @IsString() assetId?: string;
  @IsOptional() @IsString() preferredDate?: string;
  @IsOptional() @IsString() @Length(1, 1000) description?: string;
}

/**
 * PUBLIC portal endpoints — no session yet. These are EXCLUDED from the portal
 * auth middleware (see portal.module). Requesting a link is deliberately neutral
 * (it never reveals whether the contact matched a customer).
 */
@Controller('portal/auth')
export class PortalAuthController {
  constructor(private readonly auth: PortalAuthService) {}

  @Post('request-link')
  requestLink(@Body() dto: RequestLinkDto) {
    return this.auth.requestLink(dto.tenantId, dto.contact, dto.channel);
  }

  // Exchange a magic token (from the deep link) for a portal session.
  @Post('verify')
  async verify(@Body() dto: VerifyDto, @Req() req: Request) {
    return this.auth.verifyLink(dto.token, req.header('user-agent') ?? null);
  }
}

/**
 * AUTHENTICATED portal endpoints — the portal auth middleware binds the customer
 * scope before these run, so every method already acts as the signed-in
 * customer. There is no PermissionsGuard here: a customer has exactly the
 * powerless 'portal_customer' role and the service filters everything by their
 * own customer id.
 */
@Controller('portal')
export class PortalController {
  constructor(
    private readonly portal: PortalService,
    private readonly auth: PortalAuthService,
    private readonly pg: PgService,
  ) {}

  @Get('me') me() { return this.portal.me(); }

  @Post('logout')
  logout(@Req() req: Request) {
    const h = req.header('authorization');
    return this.auth.logout(h ? h.slice(7) : '');
  }

  @Get('vehicles') vehicles() { return this.portal.vehicles(); }

  @Get('work-orders')
  workOrders(@Query('open') open?: string) {
    return this.portal.workOrders({ open: open === '1' || open === 'true' });
  }
  @Get('work-orders/:id') workOrder(@Param('id') id: string) { return this.portal.workOrderDetail(id); }

  @Get('service-history') serviceHistory() { return this.portal.serviceHistory(); }

  @Get('invoices') invoices() { return this.portal.invoices(); }
  @Get('invoices/:id') invoice(@Param('id') id: string) { return this.portal.invoiceDetail(id); }

  // Stream the invoice as a real PDF the customer can save/share on their phone.
  @Get('invoices/:id/pdf')
  @Header('Content-Type', 'application/pdf')
  async invoicePdf(@Param('id') id: string, @Res() res: Response) {
    const inv = await this.portal.invoiceDetail(id);
    const ctx = getContext();
    // Pull the few extra fields the PDF wants (workshop + customer identity).
    const extra = await this.pg.withTenant(ctx.tenantId, async (tx) => {
      const t = await tx.query<any>(`SELECT name, vat_id FROM app.tenants WHERE id = $1`, [ctx.tenantId]);
      const c = await tx.query<any>(`SELECT name, vat_id, country FROM app.customers WHERE id = $1`, [ctx.customerId]);
      return { tenant: t.rows[0] ?? {}, customer: c.rows[0] ?? {} };
    });
    const pdf = generateInvoicePdf({
      workshopName: extra.tenant.name ?? 'Workshop', workshopVatId: extra.tenant.vat_id,
      invoiceNumber: inv.number ?? inv.id.slice(0, 8), issueDate: inv.issueDate ?? '', dueDate: inv.dueDate ?? '',
      customerName: extra.customer.name ?? '', customerVatId: extra.customer.vat_id, customerCountry: extra.customer.country,
      currency: inv.currency, reverseCharge: inv.reverseCharge, vatNote: inv.vatNote,
      lines: (inv.lines ?? []).map((l: any) => ({
        description: l.description, quantity: String(l.quantity),
        netMinor: String(l.net_minor ?? l.netMinor ?? 0), vatRatePct: String(l.vat_rate_pct ?? l.vatRatePct ?? 0),
      })),
      totalNetMinor: inv.totalNetMinor, totalVatMinor: inv.totalVatMinor, totalGrossMinor: inv.totalGrossMinor,
    });
    res.setHeader('Content-Disposition', `inline; filename="invoice-${inv.number ?? inv.id}.pdf"`);
    res.end(pdf);
  }

  @Get('documents') documents() { return this.portal.documents(); }

  @Get('approvals') approvals(@Query('pending') pending?: string) {
    return this.portal.approvals({ pendingOnly: pending === '1' || pending === 'true' });
  }
  @Post('approvals/:id/respond')
  respond(@Param('id') id: string, @Body() dto: RespondDto) {
    return this.portal.respondToApproval(id, dto.decision, dto.note);
  }

  @Get('appointments') appointments() { return this.portal.appointments(); }
  @Post('appointments')
  requestAppointment(@Body() dto: AppointmentDto) {
    return this.portal.requestAppointment(dto);
  }
}
