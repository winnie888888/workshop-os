/*
 * Import sink — REALNI način (Sprint 3). Demo dvojček (import-sink.ts) piše v
 * demo store; ta piše prek ISTIH REST poti kot ročni vnos (customers.create,
 * inventory.create/update), zato vsaka vrstica dobi polno strežniško
 * validacijo, audit in RLS. Brez posebnega bulk endpointa — migracijski obsegi
 * (stotine do nekaj tisoč vrstic) tečejo sekvenčno z napredkom, napake po
 * vrsticah pa se zberejo v poročilo namesto da podrejo celoto.
 *
 * Pošteno o mejah (opombe vrne CommitResult):
 *  - Stranke: backend še nima PATCH /customers — vrstice 'posodobitev' se
 *    preskočijo. Polja email/telefon/kontaktna oseba/status v strežniškem
 *    modelu stranke (zaenkrat) ne obstajajo in se ne shranijo.
 *  - Artikli: opis/EAN/dobavitelj/kategorija niso del kataloga; začetne
 *    zaloge uvoz NE knjiži (zaloga = Prevzem, z lokacijo in sledjo).
 *  - Država gre v ISO-2 (DTO validira), ID za DDV dobi manjkajoči državni
 *    prefiks; kar po popravku ni veljavno, se izpusti z opombo.
 */
import { api } from '@/lib/api';
import { normKey, normVatId } from '@/lib/import-engine';
import type { DryRunResult, RowResult } from '@/lib/import-engine';
import type { CommitResult } from '@/lib/import-sink';

/** Entitete, ki jih realni način zna zapisati danes. */
export function canCommitReal(entity: string): boolean {
  return entity === 'companies' || entity === 'products';
}

/** Obstoječi zapisi iz API, preslikani na interne ključe sheme (za dry-run). */
export async function fetchExistingReal(entity: string): Promise<any[]> {
  if (entity === 'companies') {
    const rows = await api.customers.list();
    return rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      vatId: r.vatId ?? r.vat_id ?? '',
      registrationNo: r.registrationNo ?? r.registration_no ?? '',
      country: r.country ?? '',
      address: r.address ?? '',
      city: r.city ?? '',
      postCode: r.postCode ?? r.post_code ?? '',
      email: r.email ?? '',
      phone: r.phone ?? '',
      paymentTermsDays: r.paymentTermsDays ?? r.payment_terms_days,
    }));
  }
  if (entity === 'products') {
    const rows = await api.inventory.search('');
    return rows.map((r: any) => ({
      id: r.id,
      sku: r.sku ?? '',
      name: r.name,
      oemRef: r.oemRef ?? '',
      priceMinor: r.priceMinor != null ? Number(r.priceMinor) : undefined,
      vatRatePct: r.vatRatePct != null ? Number(r.vatRatePct) : undefined,
      unit: r.unit ?? '',
    }));
  }
  return [];
}

// ---------------------------------------------------------------------------

const COUNTRY_GUESS: Array<[RegExp, string]> = [
  [/sloven/i, 'SI'], [/austri|öster|avstri/i, 'AT'], [/german|deutsch|nemč|nemc/i, 'DE'],
  [/croat|hrva/i, 'HR'], [/ital/i, 'IT'], [/hungar|madž|madz/i, 'HU'], [/serb|srb/i, 'RS'],
];

/** ISO-2 država: prefiks ID za DDV ima prednost, nato 2-črkovna koda, nato ime. */
function toIso2(country: unknown, vatId: string): string {
  if (/^[A-Z]{2}/.test(vatId)) return vatId.slice(0, 2);
  const c = String(country ?? '').trim();
  if (/^[A-Za-z]{2}$/.test(c)) return c.toUpperCase();
  for (const [re, code] of COUNTRY_GUESS) if (re.test(c)) return code;
  return 'SI';
}

function writable(dry: DryRunResult): RowResult[] {
  return dry.rows.filter((r) => r.outcome === 'create' || r.outcome === 'update');
}

function addNote(notes: string[], n: string): void {
  if (!notes.includes(n)) notes.push(n);
}

export type ProgressFn = (done: number, total: number) => void;

export async function commitImportReal(
  entity: string,
  dry: DryRunResult,
  existing: any[],
  onProgress?: ProgressFn,
): Promise<CommitResult> {
  if (entity === 'companies') return commitCompanies(dry, onProgress);
  if (entity === 'products') return commitProducts(dry, existing, onProgress);
  return {
    entity, created: 0, updated: 0, skipped: dry.total,
    notes: ['Zapis v bazo za to entiteto v realnem načinu še ni na voljo.'],
  };
}

async function commitCompanies(dry: DryRunResult, onProgress?: ProgressFn): Promise<CommitResult> {
  const res: CommitResult = { entity: 'companies', created: 0, updated: 0, skipped: dry.skipped + dry.errored, notes: [] };
  const rows = writable(dry);
  const errNotes: string[] = [];
  let unsupportedTouched = false;
  let done = 0;
  onProgress?.(0, rows.length);

  for (const r of rows) {
    done += 1;
    const v = r.record;
    if (r.outcome === 'update') {
      res.skipped += 1;
      addNote(res.notes, 'Vrstice »posodobitev« so preskočene — urejanje obstoječih strank prek uvoza pride s PATCH /customers.');
      onProgress?.(done, rows.length);
      continue;
    }
    if (v.email || v.phone || v.contactPerson || v.status) unsupportedTouched = true;

    let vat = normVatId(String(v.vatId ?? ''));
    const country = toIso2(v.country, vat);
    if (vat && /^[0-9]/.test(vat)) vat = country + vat; // '12345678' → 'SI12345678'
    if (vat && !/^[A-Za-z]{2}[0-9A-Za-z]{2,12}$/.test(vat)) {
      vat = '';
      addNote(res.notes, 'Nekateri ID-ji za DDV niso veljavni in so bili izpuščeni (zapis je ustvarjen brez DDV ID).');
    }

    const dto: Record<string, unknown> = {
      name: String(v.name ?? '').trim(),
      type: 'company',
      country,
      vatLiable: !!vat,
      currency: 'EUR',
    };
    if (vat) dto.vatId = vat;
    if (v.registrationNo) dto.registrationNo = String(v.registrationNo);
    if (v.address) dto.address = String(v.address);
    if (v.postCode) dto.postCode = String(v.postCode);
    if (v.city) dto.city = String(v.city);
    if (Number.isFinite(v.paymentTermsDays)) dto.paymentTermsDays = Math.max(0, Math.min(365, Math.round(v.paymentTermsDays)));

    try {
      await api.customers.create(dto);
      res.created += 1;
    } catch (e) {
      res.skipped += 1;
      if (errNotes.length < 5) errNotes.push(`Vrstica #${r.index + 1} (${dto.name}): ${e instanceof Error ? e.message : 'zapis ni uspel'}`);
    }
    onProgress?.(done, rows.length);
  }

  if (unsupportedTouched) {
    addNote(res.notes, 'E-pošta, telefon, kontaktna oseba in status (še) niso polja stranke v bazi — ti stolpci se ne shranijo.');
  }
  res.notes.push(...errNotes);
  return res;
}

async function commitProducts(dry: DryRunResult, existing: any[], onProgress?: ProgressFn): Promise<CommitResult> {
  const res: CommitResult = { entity: 'products', created: 0, updated: 0, skipped: dry.skipped + dry.errored, notes: [] };
  const rows = writable(dry);
  const errNotes: string[] = [];
  let unsupportedTouched = false;
  let onHandTouched = false;
  let done = 0;
  onProgress?.(0, rows.length);

  // Poišči id obstoječega artikla za 'posodobitev' — po šifri, nato po nazivu.
  const bySku = new Map<string, string>();
  const byName = new Map<string, string>();
  for (const e of existing) {
    if (e.sku) bySku.set(normKey(String(e.sku)), e.id);
    if (e.name) byName.set(normKey(String(e.name)), e.id);
  }

  for (const r of rows) {
    done += 1;
    const v = r.record;
    if (v.barcode || v.description || v.supplier || v.supplierCode || v.category) unsupportedTouched = true;
    if (Number.isFinite(v.onHand) && v.onHand > 0) onHandTouched = true;

    const dto: Record<string, unknown> = { name: String(v.name ?? '').trim() };
    if (v.sku) dto.sku = String(v.sku);
    if (v.oemRef) dto.oemRef = String(v.oemRef);
    if (v.unit) dto.unit = String(v.unit);
    if (Number.isFinite(v.priceMinor)) dto.priceMinor = Math.max(0, Math.round(v.priceMinor));
    if (Number.isFinite(v.vatRatePct)) dto.vatRatePct = String(v.vatRatePct);

    try {
      if (r.outcome === 'update') {
        const id = (v.sku && bySku.get(normKey(String(v.sku)))) || byName.get(normKey(String(v.name ?? '')));
        if (!id) {
          res.skipped += 1;
          addNote(res.notes, 'Nekaterih »posodobitev« ni bilo mogoče povezati z obstoječim artiklom — preskočene.');
        } else {
          await api.inventory.update(id, dto);
          res.updated += 1;
        }
      } else {
        await api.inventory.create(dto);
        res.created += 1;
      }
    } catch (e) {
      res.skipped += 1;
      if (errNotes.length < 5) errNotes.push(`Vrstica #${r.index + 1} (${dto.name}): ${e instanceof Error ? e.message : 'zapis ni uspel'}`);
    }
    onProgress?.(done, rows.length);
  }

  if (unsupportedTouched) {
    addNote(res.notes, 'Opis, EAN, dobavitelj in kategorija (še) niso polja kataloga — ti stolpci se ne shranijo.');
  }
  if (onHandTouched) {
    addNote(res.notes, 'Začetnih zalog uvoz ne knjiži — količine prevzemite prek Skladišče → Prevzem (lokacija + sledljivost).');
  }
  res.notes.push(...errNotes);
  return res;
}
