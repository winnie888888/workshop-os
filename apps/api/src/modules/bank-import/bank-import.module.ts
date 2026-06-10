import { createHash } from 'crypto';
import { BadRequestException, Body, Controller, Injectable, Module, Post } from '@nestjs/common';
import { getContext, Permission } from '@workshop/shared';
import { PgService } from '../../common/db/pg.service';
import { RequirePermissions } from '../../auth/permissions.guard';
import { InvoicesModule } from '../invoices/invoices.module';
import { InvoicesService } from '../invoices/invoices.service';

/*
 * Plačila P2 — uvoz bančnih izpiskov camt.053 (ISO 20022).
 *
 * Zanka se sklene: UPN QR na računu (P1) nosi RF sklic; stranka plača s
 * telefonom; banka sklic vrne na izpisku; ta modul ga prebere in račun zapre
 * sam. Knjiženje gre skozi InvoicesService.applyPaymentToInvoice — isti zapis
 * (payments + allocations + status računa) kot ročno plačilo, ena resnica.
 *
 * Parser je namenoma lasten in odvisnosti prost: camt.053 je predvidljiv XML,
 * potrebujemo ozek nabor polj (Ntry bloki). Pošteno: to ni polni ISO 20022
 * bralnik — neznana polja ignorira, vsak priliv brez prepoznanega sklica pa
 * konča kot »predlog« ali »brez ujemanja« za človeško odločitev, nikoli kot
 * tiha samodejna knjižba.
 *
 * Idempotenca (varnost pred dvojno knjižbo): vsak priliv ima prstni odtis
 * (AcctSvcrRef / EndToEndId / hash) z UNIQUE (tenant, fingerprint). Vrstica
 * nastane kot 'pending' PRED knjižbo in postane 'applied' PO njej; ponovni
 * uvoz istega izpiska 'applied' preskoči, 'pending' (prekinjen poskus) pa
 * varno dokonča.
 */

/* ------------------------------- camt parser ------------------------------- */

export interface CamtEntry {
  fingerprint: string;
  credit: boolean;
  amountMinor: string;
  currency: string;
  bookingDate: string | null; // YYYY-MM-DD
  payerName: string | null;
  payerIban: string | null;
  reference: string | null;   // strukturiran sklic (RF.. / SI..), brez presledkov
  details: string | null;     // Ustrd prosto besedilo
}

export interface CamtStatement {
  accountIban: string | null;
  from: string | null;
  to: string | null;
  entries: CamtEntry[];
}

const first = (block: string, name: string): string | null => {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`));
  return m ? m[1].trim() : null;
};
const all = (block: string, name: string): string[] => {
  const out: string[] = [];
  const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'g');
  for (let m = re.exec(block); m; m = re.exec(block)) out.push(m[1].trim());
  return out;
};
const unescapeXml = (s: string) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

export function parseCamt053(xmlRaw: string): CamtStatement {
  // Namespace prefiksi (<ns:Ntry>) → goli elementi; CRLF poenoten.
  const xml = xmlRaw.replace(/\r\n?/g, '\n').replace(/<(\/?)[A-Za-z0-9]+:/g, '<$1');
  if (!xml.includes('<Ntry')) {
    throw new BadRequestException(
      'Datoteka ne izgleda kot camt.053 izpisek (ni <Ntry> vnosov). Iz e-banke izvozite izpisek v formatu ISO 20022 / camt.053 XML.',
    );
  }

  const stmt = first(xml, 'Stmt') ?? xml;
  const acct = first(stmt, 'Acct');
  const accountIban = acct ? first(acct, 'IBAN') : null;
  const frTo = first(stmt, 'FrToDt');
  const from = frTo ? (first(frTo, 'FrDtTm') ?? first(frTo, 'FrDt')) : null;
  const to = frTo ? (first(frTo, 'ToDtTm') ?? first(frTo, 'ToDt')) : null;

  const entries: CamtEntry[] = all(stmt, 'Ntry').map((e) => {
    const amtM = e.match(/<Amt[^>]*Ccy="([A-Z]{3})"[^>]*>([\d.]+)<\/Amt>/);
    const currency = amtM ? amtM[1] : 'EUR';
    const amountMinor = amtM ? String(Math.round(parseFloat(amtM[2]) * 100)) : '0';
    const credit = (first(e, 'CdtDbtInd') ?? '') === 'CRDT';
    const bookg = first(e, 'BookgDt') ?? first(e, 'ValDt');
    const bookingDate = bookg ? (first(bookg, 'Dt') ?? first(bookg, 'DtTm'))?.slice(0, 10) ?? null : null;

    // Strukturiran sklic: prvi <Ref> znotraj katerega koli <CdtrRefInf>.
    let reference: string | null = null;
    for (const refInf of all(e, 'CdtrRefInf')) {
      const r = first(refInf, 'Ref');
      if (r) { reference = r.replace(/\s+/g, '').toUpperCase(); break; }
    }
    const details = all(e, 'Ustrd').map(unescapeXml).join(' · ') || null;
    // Sklic se v praksi znajde tudi v prostem besedilu (SI00 2026-156 …);
    // meje besed preprečijo, da bi pogoltnili nadaljnje besede.
    if (!reference && details) {
      const up = details.toUpperCase();
      const rf = up.match(/\bRF\d{2}[A-Z0-9]{1,21}\b/);
      if (rf) reference = rf[0];
      else {
        const si = up.match(/\bSI\d{2}\s?[0-9][0-9 \-]{1,24}[0-9]/);
        if (si) reference = si[0].replace(/\s+/g, '');
      }
    }

    const dbtr = first(e, 'Dbtr');
    const payerName = dbtr ? (first(dbtr, 'Nm') ? unescapeXml(first(dbtr, 'Nm')!) : null) : null;
    const dbtrAcct = first(e, 'DbtrAcct');
    const payerIban = dbtrAcct ? first(dbtrAcct, 'IBAN') : null;

    const acctSvcrRef = first(e, 'AcctSvcrRef');
    const endToEnd = all(e, 'EndToEndId').find((x) => x && x !== 'NOTPROVIDED') ?? null;
    const fingerprint = acctSvcrRef
      ?? endToEnd
      ?? createHash('sha256').update([bookingDate, amountMinor, currency, reference, payerIban, details].join('|')).digest('hex').slice(0, 40);

    return { fingerprint, credit, amountMinor, currency, bookingDate, payerName, payerIban, reference, details };
  });

  return { accountIban, from: from?.slice(0, 10) ?? null, to: to?.slice(0, 10) ?? null, entries };
}

/* ----------------------------- sklic validacija ---------------------------- */

/** ISO 11649: RFkk + payload; mod-97 nad payload+'RF00' (črke → code-55) mora dati kk. */
export function isValidRf(ref: string): boolean {
  const m = /^RF(\d{2})([A-Z0-9]{1,21})$/.exec(ref);
  if (!m) return false;
  const rearranged = m[2] + 'RF' + m[1];
  let rem = 0;
  for (const ch of rearranged) {
    const v = ch >= 'A' && ch <= 'Z' ? String(ch.charCodeAt(0) - 55) : ch;
    for (const d of v) rem = (rem * 10 + (d.charCodeAt(0) - 48)) % 97;
  }
  return rem === 1;
}

/* --------------------------------- service --------------------------------- */

type MatchKind = 'auto' | 'suggested' | 'none' | 'duplicate' | 'debit';

interface OpenInvoice {
  id: string; number: string; customerId: string; customerName: string | null;
  remainingMinor: bigint; normNumber: string;
}

@Injectable()
export class BankImportService {
  constructor(private readonly pg: PgService, private readonly invoices: InvoicesService) {}

  private async openInvoices(tx: any): Promise<OpenInvoice[]> {
    const res = await tx.query(
      `SELECT i.id, i.number, i.customer_id, i.total_gross_minor, i.paid_minor, c.name AS customer_name
         FROM app.invoices i
         LEFT JOIN app.customers c ON c.id = i.customer_id
        WHERE i.status IN ('issued','sent','partly_paid','overdue')
          AND i.kind <> 'credit_note' AND i.number IS NOT NULL`,
    );
    return res.rows
      .map((r: any) => ({
        id: r.id, number: r.number, customerId: r.customer_id, customerName: r.customer_name ?? null,
        remainingMinor: BigInt(r.total_gross_minor) - BigInt(r.paid_minor ?? 0),
        normNumber: String(r.number).replace(/[^A-Za-z0-9]/g, '').toUpperCase(),
      }))
      .filter((r: OpenInvoice) => r.remainingMinor > 0n);
  }

  /** Sklic z izpiska → odprti računi. RF preverjen po ISO 11649; SI po vsebovani številki. */
  private matchByReference(reference: string | null, open: OpenInvoice[]): OpenInvoice[] {
    if (!reference) return [];
    if (reference.startsWith('RF')) {
      if (!isValidRf(reference)) return [];
      const payload = reference.slice(4);
      return open.filter((i) => i.normNumber === payload);
    }
    if (reference.startsWith('SI')) {
      const body = reference.slice(4).replace(/[^A-Za-z0-9]/g, '');
      if (body.length < 3) return [];
      return open.filter((i) => i.normNumber === body || i.normNumber.endsWith(body) || body.endsWith(i.normNumber));
    }
    return [];
  }

  async preview(xml: string) {
    const ctx = getContext();
    const stmt = parseCamt053(xml);

    return this.pg.withTenant(ctx.tenantId, async (tx) => {
      const open = await this.openInvoices(tx);
      const fps = stmt.entries.map((e) => e.fingerprint);
      const known = new Map<string, string>(
        (await tx.query(
          `SELECT fingerprint, status FROM app.bank_import_entries WHERE fingerprint = ANY($1)`,
          [fps],
        )).rows.map((r: any) => [r.fingerprint, r.status]),
      );

      const toCard = (i: OpenInvoice) => ({
        id: i.id, number: i.number, customerName: i.customerName, remainingMinor: i.remainingMinor.toString(),
      });

      const entries = stmt.entries.map((e, idx) => {
        let match: MatchKind; let invoice: OpenInvoice | null = null; let candidates: OpenInvoice[] = [];
        if (!e.credit) match = 'debit';
        else if (known.get(e.fingerprint) === 'applied') match = 'duplicate';
        else {
          const byRef = this.matchByReference(e.reference, open);
          if (byRef.length === 1) { match = 'auto'; invoice = byRef[0]; }
          else if (byRef.length > 1) { match = 'suggested'; candidates = byRef; }
          else {
            // Brez sklica: predlogi po točnem znesku odprtega salda (nikoli auto).
            candidates = open.filter((i) => i.remainingMinor === BigInt(e.amountMinor)).slice(0, 3);
            match = candidates.length > 0 ? 'suggested' : 'none';
          }
        }
        return {
          idx, ...e, match,
          invoice: invoice ? toCard(invoice) : null,
          candidates: candidates.map(toCard),
        };
      });

      return {
        accountIban: stmt.accountIban, from: stmt.from, to: stmt.to,
        total: stmt.entries.length,
        credits: stmt.entries.filter((e) => e.credit).length,
        autoMatched: entries.filter((e) => e.match === 'auto').length,
        entries,
      };
    });
  }

  async apply(dto: {
    filename?: string; accountIban?: string | null; from?: string | null; to?: string | null;
    total?: number; credits?: number;
    items: Array<{
      fingerprint: string; invoiceId: string; amountMinor: string; bookingDate?: string | null;
      currency?: string; payerName?: string | null; payerIban?: string | null;
      reference?: string | null; details?: string | null;
    }>;
  }) {
    const ctx = getContext();
    if (!Array.isArray(dto.items) || dto.items.length === 0)
      throw new BadRequestException('Ni izbranih plačil za knjiženje.');
    if (dto.items.length > 500) throw new BadRequestException('Naenkrat lahko knjižite največ 500 plačil.');

    // Glava uvoza (revizijska sled datoteke).
    const importId: string = await this.pg.withTenant(ctx.tenantId, async (tx) =>
      (await tx.query(
        `INSERT INTO app.bank_imports (tenant_id, filename, account_iban, stmt_from, stmt_to, entries_total, entries_credit, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
        [ctx.tenantId, dto.filename ?? null, dto.accountIban ?? null, dto.from ?? null, dto.to ?? null,
         dto.total ?? dto.items.length, dto.credits ?? dto.items.length, ctx.userId],
      )).rows[0].id);

    const results: Array<{ fingerprint: string; status: string; invoiceNumber?: string | null; appliedMinor?: string; unappliedMinor?: string; error?: string }> = [];

    for (const item of dto.items) {
      // 1) Rezerviraj prstni odtis ('pending') — idempotenčna ključavnica.
      const entryId = await this.pg.withTenant(ctx.tenantId, async (tx) => {
        const ins = await tx.query(
          `INSERT INTO app.bank_import_entries
             (tenant_id, import_id, fingerprint, amount_minor, currency, booking_date,
              payer_name, payer_iban, reference, details, status, matched_invoice_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending',$11)
           ON CONFLICT (tenant_id, fingerprint) DO NOTHING
           RETURNING id`,
          [ctx.tenantId, importId, item.fingerprint, item.amountMinor, item.currency ?? 'EUR',
           item.bookingDate ?? null, item.payerName ?? null, item.payerIban ?? null,
           item.reference ?? null, item.details ?? null, item.invoiceId],
        );
        if (ins.rows[0]) return ins.rows[0].id as string;
        const ex = await tx.query(
          `SELECT id, status FROM app.bank_import_entries WHERE fingerprint = $1`,
          [item.fingerprint],
        );
        const row = ex.rows[0];
        return row && row.status === 'pending' ? (row.id as string) : null; // applied/skipped → preskoči
      });
      if (!entryId) { results.push({ fingerprint: item.fingerprint, status: 'duplicate' }); continue; }

      // 2) Knjiži (lastna tx v invoices domeni — ena resnica o saldu/statusu).
      try {
        const pay = await this.invoices.applyPaymentToInvoice({
          invoiceId: item.invoiceId, amountMinor: item.amountMinor,
          receivedAt: item.bookingDate ?? new Date().toISOString().slice(0, 10),
          reference: item.reference ?? null, payerName: item.payerName ?? null, source: 'bank_import',
        });
        // 3) Označi vnos kot knjižen.
        await this.pg.withTenant(ctx.tenantId, async (tx) => {
          await tx.query(
            `UPDATE app.bank_import_entries SET status = 'applied', payment_id = $2 WHERE id = $1`,
            [entryId, pay.paymentId],
          );
        });
        results.push({
          fingerprint: item.fingerprint, status: 'applied',
          invoiceNumber: pay.invoiceNumber, appliedMinor: pay.appliedMinor, unappliedMinor: pay.unappliedMinor,
        });
      } catch (e: any) {
        // Vnos ostane 'pending' brez payment_id → ponovni uvoz ga varno dokonča.
        results.push({ fingerprint: item.fingerprint, status: 'error', error: e?.message ?? 'Knjiženje ni uspelo' });
      }
    }

    return {
      importId,
      applied: results.filter((r) => r.status === 'applied').length,
      duplicates: results.filter((r) => r.status === 'duplicate').length,
      errors: results.filter((r) => r.status === 'error').length,
      results,
    };
  }
}

/* -------------------------------- controller ------------------------------- */

@Controller('bank-import')
export class BankImportController {
  constructor(private readonly svc: BankImportService) {}

  /** Razčleni izpisek in vrne predogled ujemanj — NIČ se še ne knjiži. */
  @Post('preview')
  @RequirePermissions(Permission.InvoiceIssue)
  preview(@Body() body: { xml?: string }) {
    const xml = typeof body?.xml === 'string' ? body.xml : '';
    if (xml.trim().length === 0) throw new BadRequestException('Manjka vsebina izpiska (xml).');
    return this.svc.preview(xml);
  }

  /** Knjiži IZBRANA plačila iz predogleda (idempotentno po prstnem odtisu). */
  @Post('apply')
  @RequirePermissions(Permission.InvoiceIssue)
  apply(@Body() body: any) {
    return this.svc.apply(body ?? {});
  }
}

@Module({
  imports: [InvoicesModule],
  controllers: [BankImportController],
  providers: [BankImportService],
})
export class BankImportModule {}
