/**
 * ZDDV-1 vsebinska skladnost računa (82. člen) — strukturna pred-preverba.
 *
 * NAMEN IN MEJE:
 * To je preverba OBVEZNIH PODATKOV na računu po 82. členu ZDDV-1, ki velja v
 * Sloveniji DANES (za papirne in elektronske račune enako, 84. člen). Manjkajoč
 * obvezen podatek pomeni, da račun ni veljaven za odbitek DDV pri kupcu — zato
 * ga prestrežemo PREDEN izdamo račun, ne šele ko ga zavrne prejemnik ali inšpektor.
 *
 * To NI e-SLOG 2.0 / EN 16931 XSD validacija in NI Peppol skladnost. Tisto je
 * sintaktična shema-validacija, ki jo (od 2028, ko postane B2B e-račun obvezen
 * po ZIERDED) opravi Peppol Access Point / UJP ob prenosu — ne ta funkcija.
 * Ta preverba je nadmnožica-neodvisna: ZDDV-1 obvezni podatki so vsebinska
 * podlaga, ki mora držati ne glede na transportni standard, zato ostane
 * uporabna tudi po 2028 (e-SLOG dokument brez teh podatkov bi tako ali tako
 * padel). Polna EN 16931 validacija se priklopi ločeno (glej einvoice kanal).
 *
 * Funkcija je ČISTA (brez I/O), da je enotno testabilna in deljiva med API
 * (pred izdajo) in UI (predogled »kaj manjka«).
 */

/** Resnost najdbe: 'error' blokira izdajo, 'warning' opozori a ne blokira. */
export type ComplianceSeverity = 'error' | 'warning';

export interface ComplianceFinding {
  /** Strojni kod najdbe (za i18n / filtriranje), npr. 'missing_supplier_vat_id'. */
  code: string;
  severity: ComplianceSeverity;
  /** Človeško sporočilo (SL), pripravljeno za prikaz uporabniku. */
  message: string;
  /** Sklic na člen ZDDV-1 za sledljivost. */
  article: string;
}

export interface ComplianceResult {
  ok: boolean; // true, če ni nobene 'error' najdbe (lahko pa so opozorila)
  findings: ComplianceFinding[];
}

/**
 * Oblika, ki jo preverjevalnik potrebuje. Namenoma minimalna in usklajena z
 * InvoiceForEInvoice (kanonična oblika računa), da deluje za vse vire izdaje
 * (delovni nalog / proste vrstice / zbirni račun) enako.
 */
export interface InvoiceForCompliance {
  number: string | null;
  issueDate: string | null;
  /** Datum dobave; obvezen le, če je različen od datuma izdaje (82. čl. 7. tč.). */
  supplyDate?: string | null;
  currency: string | null;
  reverseCharge: boolean;
  vatNote: string | null;
  supplier: { name: string | null; address?: string | null; vatId: string | null };
  customer: { name: string | null; address: string | null; vatId: string | null };
  netMinor: string;
  vatMinor: string;
  grossMinor: string;
  lines: Array<{ description: string | null; quantity: string | null }>;
  vatBreakdown: Array<{ ratePct: string; reverseCharge: boolean; netMinor: string; vatMinor: string }>;
}

function isBlank(v: string | null | undefined): boolean {
  return v === null || v === undefined || v.trim() === '';
}

/** Vsota minor-string vrednosti (brez izgube natančnosti prek BigInt). */
function sumMinor(values: string[]): bigint {
  return values.reduce((acc, v) => acc + BigInt(v || '0'), 0n);
}

/**
 * Preveri račun proti 82. členu ZDDV-1. Vrne najdbe; `ok=false`, če je vsaj ena
 * 'error'. Klicatelj (issue tok) naj ob `ok=false` izdaje NE dovoli.
 */
export function checkZddv1Compliance(inv: InvoiceForCompliance): ComplianceResult {
  const f: ComplianceFinding[] = [];
  const A82 = '82. člen ZDDV-1';

  // 82(1) t.2 — zaporedna številka.
  if (isBlank(inv.number)) {
    f.push({ code: 'missing_invoice_number', severity: 'error', article: A82,
      message: 'Manjka zaporedna številka računa (82. člen, 2. točka).' });
  }
  // 82(1) t.1 — datum izdaje.
  if (isBlank(inv.issueDate)) {
    f.push({ code: 'missing_issue_date', severity: 'error', article: A82,
      message: 'Manjka datum izdaje računa (82. člen, 1. točka).' });
  }
  // 84.a — znesek DDV mora biti v EUR. Tuje valute so dovoljene za zneske, a DDV v EUR.
  if (isBlank(inv.currency)) {
    f.push({ code: 'missing_currency', severity: 'error', article: '84.a člen ZDDV-1',
      message: 'Manjka valuta računa.' });
  } else if (inv.currency !== 'EUR') {
    f.push({ code: 'vat_currency_not_eur', severity: 'warning', article: '84.a člen ZDDV-1',
      message: `Račun je v ${inv.currency}; znesek DDV mora biti izkazan tudi v EUR (84.a člen).` });
  }

  // 82(1) t.5 — ime (in naslov) dobavitelja in kupca.
  if (isBlank(inv.supplier.name)) {
    f.push({ code: 'missing_supplier_name', severity: 'error', article: A82,
      message: 'Manjka ime dobavitelja (82. člen, 5. točka).' });
  }
  if (isBlank(inv.customer.name)) {
    f.push({ code: 'missing_customer_name', severity: 'error', article: A82,
      message: 'Manjka ime kupca (82. člen, 5. točka).' });
  }
  if (isBlank(inv.customer.address)) {
    f.push({ code: 'missing_customer_address', severity: 'warning', article: A82,
      message: 'Manjka naslov kupca (82. člen, 5. točka).' });
  }

  // 82(1) t.3 — ID za DDV dobavitelja (ko je zavezanec). Ključno za odbitek pri kupcu.
  if (isBlank(inv.supplier.vatId)) {
    f.push({ code: 'missing_supplier_vat_id', severity: 'error', article: A82,
      message: 'Manjka identifikacijska številka za DDV dobavitelja (82. člen, 3. točka).' });
  }

  // 82(1) t.6 — količina in vrsta (opis) za vsako postavko.
  if (inv.lines.length === 0) {
    f.push({ code: 'no_lines', severity: 'error', article: A82,
      message: 'Račun nima nobene postavke (82. člen, 6. točka).' });
  }
  inv.lines.forEach((l, i) => {
    if (isBlank(l.description)) {
      f.push({ code: 'line_missing_description', severity: 'error', article: A82,
        message: `Postavka ${i + 1}: manjka opis blaga/storitve (82. člen, 6. točka).` });
    }
    if (isBlank(l.quantity)) {
      f.push({ code: 'line_missing_quantity', severity: 'warning', article: A82,
        message: `Postavka ${i + 1}: manjka količina (82. člen, 6. točka).` });
    }
  });

  // 82(1) t.8,9,10 — davčna osnova po stopnji, stopnja DDV, znesek DDV.
  if (inv.vatBreakdown.length === 0) {
    f.push({ code: 'no_vat_breakdown', severity: 'error', article: A82,
      message: 'Manjka davčna razčlenitev (osnova/stopnja/znesek DDV po stopnji) (82. člen, 8.–10. točka).' });
  }

  // Reverse charge (76.a / 44. čl.): obvezna navedba na računu + DDV se ne obračuna.
  if (inv.reverseCharge) {
    if (isBlank(inv.vatNote)) {
      f.push({ code: 'missing_reverse_charge_note', severity: 'error', article: '76.a člen ZDDV-1',
        message: 'Pri obrnjeni davčni obveznosti mora biti na računu navedba (npr. »obrnjena davčna obveznost«) in sklic na 76.a člen.' });
    }
    // Pri RC mora biti znan tudi ID za DDV kupca (82. člen, 4. točka).
    if (isBlank(inv.customer.vatId)) {
      f.push({ code: 'missing_customer_vat_id_rc', severity: 'error', article: A82,
        message: 'Pri obrnjeni davčni obveznosti je obvezna identifikacijska številka za DDV kupca (82. člen, 4. točka).' });
    }
  }

  // Aritmetična konsistenca: net + vat = gross, in vsota razčlenitve = skupne vsote.
  // (Ni neposredna zahteva 82. člena, a nekonsistentne vsote pomenijo napačen
  //  račun in jih e-SLOG/AP zavrne; ujamemo jih zdaj kot napako.)
  try {
    const net = BigInt(inv.netMinor || '0');
    const vat = BigInt(inv.vatMinor || '0');
    const gross = BigInt(inv.grossMinor || '0');
    if (net + vat !== gross) {
      f.push({ code: 'totals_mismatch', severity: 'error', article: A82,
        message: `Vsote se ne ujemajo: neto (${net}) + DDV (${vat}) ≠ bruto (${gross}).` });
    }
    const bNet = sumMinor(inv.vatBreakdown.map((g) => g.netMinor));
    const bVat = sumMinor(inv.vatBreakdown.map((g) => g.vatMinor));
    if (inv.vatBreakdown.length > 0 && bNet !== net) {
      f.push({ code: 'breakdown_net_mismatch', severity: 'error', article: A82,
        message: `Vsota davčnih osnov po stopnjah (${bNet}) ne ustreza neto vrednosti računa (${net}).` });
    }
    if (inv.vatBreakdown.length > 0 && bVat !== vat) {
      f.push({ code: 'breakdown_vat_mismatch', severity: 'error', article: A82,
        message: `Vsota DDV po stopnjah (${bVat}) ne ustreza skupnemu DDV računa (${vat}).` });
    }
  } catch {
    f.push({ code: 'totals_unparseable', severity: 'error', article: A82,
      message: 'Zneskov računa ni mogoče preveriti (neveljavne vrednosti).' });
  }

  return { ok: !f.some((x) => x.severity === 'error'), findings: f };
}
