/*
 * UPN QR (ZBS) + EPC QR (SEPA) — generiranje plačilnih QR kod.
 *
 * UPN QR po uradnem standardu Združenja bank Slovenije:
 *   "Tehnični standard UPN QR" (zbs-giz.si, verzija 1.1) — polja 1–20, vsako
 *   zaključeno z LF (0x0A); prazno polje = samo LF. Polje 20 = kontrolna
 *   vsota: strlen(N1+'\n') + … + strlen(N19+'\n'), 3 mesta z vodilnimi ničlami.
 *   Koda QR: verzija 15 (77×77) OBVEZNO, Byte, ECC M, ECI 000004, ISO 8859-2.
 *   Največja dolžina vsebine (vključno z ločili, brez rezerve): 411 znakov.
 *
 * EPC QR ("Scan to Pay", EPC069-12 v2): za plačnike s tujimi bankami /
 *   fintechi (Revolut, N26 …), ki UPN QR ne znajo brati. UTF-8, ECC M.
 *
 * Vse funkcije so čiste (brez React/DOM) in pokrite s samopreizkusom proti
 * uradnim primerom standarda (glej scripts/test-upn-qr.js v repozitoriju gradnje).
 */

import qrcodegen from './qrcodegen';

const LF = '\n';
export const UPN_MAX_PAYLOAD = 411;

/* ----------------------------- ISO 8859-2 ------------------------------ */

// Znaki izven ASCII, ki jih ISO 8859-2 pozna in jih realno srečamo v SI/HR/DE
// imenih. Vrednost = bajt v Latin-2. Vse transformacije ohranijo dolžino 1:1,
// zato kontrolna vsota (v znakih) ostane enaka dolžini v bajtih.
const LATIN2: Record<string, number> = {
  'Č': 0xc8, 'č': 0xe8, 'Š': 0xa9, 'š': 0xb9, 'Ž': 0xae, 'ž': 0xbe,
  'Đ': 0xd0, 'đ': 0xf0, 'Ć': 0xc6, 'ć': 0xe6,
  'Ä': 0xc4, 'ä': 0xe4, 'Ö': 0xd6, 'ö': 0xf6, 'Ü': 0xdc, 'ü': 0xfc, 'ß': 0xdf,
  'Á': 0xc1, 'á': 0xe1, 'É': 0xc9, 'é': 0xe9, 'Í': 0xcd, 'í': 0xed,
  'Ó': 0xd3, 'ó': 0xf3, 'Ú': 0xda, 'ú': 0xfa, 'Ý': 0xdd, 'ý': 0xfd,
  'Ě': 0xcc, 'ě': 0xec, 'Ř': 0xd8, 'ř': 0xf8, 'Ů': 0xd9, 'ů': 0xf9,
  'Ł': 0xa3, 'ł': 0xb3, 'Ą': 0xa1, 'ą': 0xb1, 'Ę': 0xca, 'ę': 0xea,
  'Ő': 0xd5, 'ő': 0xf5, 'Ű': 0xdb, 'ű': 0xfb,
};

/** En znak → en Latin-2 bajt; neznane znake transliterira (NFD) ali zamenja z '?'. */
export function latin2Bytes(text: string): number[] {
  const out: number[] = [];
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if (code < 0x80) { out.push(code); continue; }
    const mapped = LATIN2[ch];
    if (mapped !== undefined) { out.push(mapped); continue; }
    // Transliteracija: odstrani diakritiko (é→e); če ostane ne-ASCII → '?'.
    const stripped = ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const sc = stripped.length === 1 ? stripped.codePointAt(0)! : 0;
    out.push(sc > 0 && sc < 0x80 ? sc : 0x3f /* ? */);
  }
  return out;
}

/* --------------------------- RF referenca (ISO 11649) ------------------ */

/**
 * Iz številke dokumenta zgradi strukturirano referenco RF (ISO 11649),
 * ki jo UPN QR in EPC QR sprejmeta ("RF" + 2 kontrolni + do 21 alfanum.).
 * Primer iz standarda: 'SBO2010' → 'RF45SBO2010'.
 */
export function rfReference(docNo: string): string {
  const clean = docNo.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 21);
  if (!clean) throw new Error('RF referenca: številka dokumenta je prazna.');
  // mod 97-10 nad (clean + 'RF00'), črke → 10..35, računano iterativno.
  let rem = 0;
  for (const ch of clean + 'RF00') {
    const v = ch >= '0' && ch <= '9' ? ch.charCodeAt(0) - 48 : ch.charCodeAt(0) - 55;
    rem = v < 10 ? (rem * 10 + v) % 97 : (rem * 100 + v) % 97;
  }
  const check = String(98 - rem).padStart(2, '0');
  return `RF${check}${clean}`;
}

/* ------------------------------ pomožne -------------------------------- */

function cleanField(v: string | null | undefined): string {
  return (v ?? '').replace(/[\r\n\t]+/g, ' ').replace(/ {2,}/g, ' ').trim();
}

function cleanIban(v: string | null | undefined): string {
  return (v ?? '').toUpperCase().replace(/\s+/g, '');
}

function cleanReference(v: string | null | undefined): string {
  return (v ?? '').toUpperCase().replace(/\s+/g, '');
}

/** 'YYYY-MM-DD' | Date → 'DD.MM.YYYY' (UPN format); prazno → ''. */
export function upnDate(d: string | Date | null | undefined): string {
  if (!d) return '';
  if (d instanceof Date) {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}.${mm}.${d.getFullYear()}`;
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d.trim());
  if (m) return `${m[3]}.${m[2]}.${m[1]}`;
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(d.trim())) return d.trim();
  return '';
}

/* --------------------------- UPN QR vsebina ---------------------------- */

export interface UpnQrInput {
  /** Prejemnik plačila (delavnica). */
  recipient: { iban: string; name: string; street?: string | null; city?: string | null };
  /** Znesek v centih (polje 9: 11 mest z vodilnimi ničlami). */
  amountMinor: number | string;
  /** Koda namena, 4 velike črke (GDSV blago/storitve, ADVA avans, SVCS storitve …). Privzeto GDSV. */
  purposeCode?: string;
  /** Namen plačila (polje 13), npr. "Račun 2026-00012". */
  purpose: string;
  /** Rok plačila (polje 14) — 'YYYY-MM-DD', Date ali že 'DD.MM.YYYY'. */
  deadline?: string | Date | null;
  /** Referenca prejemnika (polje 16), model+sklic skupaj, npr. 'RF45SBO2010' ali 'SI00123-45'. */
  reference?: string | null;
  /** Plačnik (stranka) — vsa polja neobvezna; banka jih ob skenu lahko prepiše. */
  payer?: { name?: string | null; street?: string | null; city?: string | null; iban?: string | null; reference?: string | null } | null;
  /** Datum plačila (polje 10) in oznaka nujno (polje 11) — redko potrebna. */
  paymentDate?: string | Date | null;
  urgent?: boolean;
  /** Polog/dvig gotovine (polji 3 in 4) — za delavnico nepotrebno, podprto zaradi popolnosti standarda. */
  deposit?: boolean;
  withdrawal?: boolean;
}

export interface UpnQrResult {
  /** Celotna vsebina QR (polja 1–20, vsako + LF). */
  payload: string;
  /** Polja 1–20 brez ločil — za teste in prikaz. */
  fields: string[];
  /** Skupna dolžina vsebine (≤ 411). */
  length: number;
}

/** Zgradi vsebino UPN QR po uradni strukturi (polja 1–20 + kontrolna vsota). */
export function buildUpnQr(input: UpnQrInput): UpnQrResult {
  const recIban = cleanIban(input.recipient.iban);
  if (!/^[A-Z]{2}[0-9A-Z]{11,32}$/.test(recIban))
    throw new Error('IBAN prejemnika ni veljaven (pričakujem npr. SI56 0510 0801 0486 080).');

  const amount = typeof input.amountMinor === 'string' ? Number(input.amountMinor) : input.amountMinor;
  if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount < 0 || amount > 99999999999)
    throw new Error('Znesek za QR ni veljaven (celo število centov, največ 11 mest).');

  const purposeCode = (input.purposeCode ?? 'GDSV').toUpperCase();
  if (!/^[A-Z]{4}$/.test(purposeCode))
    throw new Error('Koda namena mora biti 4 velike črke (npr. GDSV, ADVA, SVCS).');

  const purpose = cleanField(input.purpose);
  if (!purpose) throw new Error('Namen plačila je obvezen.');
  if (purpose.length > 70) throw new Error('Namen plačila je predolg (do 70 znakov).');

  const reference = cleanReference(input.reference);
  if (reference && !/^(SI|RF)[0-9A-Z-]{1,24}$/.test(reference))
    throw new Error('Referenca prejemnika mora biti v obliki SI.. ali RF.. (model in sklic skupaj, brez presledkov).');

  const payerIban = cleanIban(input.payer?.iban);
  const payerRef = cleanReference(input.payer?.reference);

  // Polja 1–19 (vrstni red iz standarda; prazno polje = '').
  const f: string[] = [
    /* 1 */ 'UPNQR',
    /* 2 */ payerIban,
    /* 3 */ input.deposit ? 'X' : '',
    /* 4 */ input.withdrawal ? 'X' : '',
    /* 5 */ payerRef,
    /* 6 */ cleanField(input.payer?.name).slice(0, 33),
    /* 7 */ cleanField(input.payer?.street).slice(0, 33),
    /* 8 */ cleanField(input.payer?.city).slice(0, 33),
    /* 9 */ String(amount).padStart(11, '0'),
    /* 10 */ upnDate(input.paymentDate),
    /* 11 */ input.urgent ? 'X' : '',
    /* 12 */ purposeCode,
    /* 13 */ purpose,
    /* 14 */ upnDate(input.deadline),
    /* 15 */ recIban,
    /* 16 */ reference,
    /* 17 */ cleanField(input.recipient.name).slice(0, 33),
    /* 18 */ cleanField(input.recipient.street).slice(0, 33),
    /* 19 */ cleanField(input.recipient.city).slice(0, 33),
  ];

  // Polje 20: vsota strlen(N_i + LF) za i = 1..19, tri mesta.
  const sum = f.reduce((acc, v) => acc + v.length + 1, 0);
  const f20 = String(sum).padStart(3, '0');
  const fields = [...f, f20];
  const payload = fields.join(LF) + LF;

  if (payload.length > UPN_MAX_PAYLOAD)
    throw new Error(`Vsebina UPN QR je predolga (${payload.length}/${UPN_MAX_PAYLOAD} znakov) — skrajšajte namen plačila ali naziv.`);

  return { payload, fields, length: payload.length };
}

/* --------------------------- EPC QR (SEPA) ----------------------------- */

export interface EpcQrInput {
  name: string;           // prejemnik, ≤ 70 znakov
  iban: string;
  amountMinor: number | string;
  /** Strukturirana referenca (ISO 11649 RF…) — priporočeno. */
  reference?: string | null;
  /** Nestrukturiran namen — uporabljen samo, če reference ni. */
  remittance?: string | null;
}

/** EPC069-12 v2 "Scan to Pay" vsebina (UTF-8). */
export function buildEpcQr(input: EpcQrInput): string {
  const iban = cleanIban(input.iban);
  const amount = typeof input.amountMinor === 'string' ? Number(input.amountMinor) : input.amountMinor;
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Znesek za SEPA QR ni veljaven.');
  const eur = `EUR${(amount / 100).toFixed(2)}`;
  const ref = cleanReference(input.reference);
  const remit = ref ? '' : cleanField(input.remittance).slice(0, 140);
  const lines = [
    'BCD', '002', '1', 'SCT',
    '',                                   // BIC (v2: neobvezen v EGP)
    cleanField(input.name).slice(0, 70),
    iban,
    eur,
    '',                                   // purpose (4 črke, neobvezno)
    ref,                                  // structured remittance
    remit,                                // unstructured remittance
  ];
  return lines.join(LF);
}

/* ------------------------------ QR → SVG ------------------------------- */

function qrToSvg(qr: InstanceType<typeof qrcodegen.QrCode>, border: number, title: string): string {
  const n = qr.size + border * 2;
  let d = '';
  for (let y = 0; y < qr.size; y++)
    for (let x = 0; x < qr.size; x++)
      if (qr.getModule(x, y)) d += `M${x + border} ${y + border}h1v1h-1z`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges" role="img" aria-label="${title}">` +
    `<rect width="${n}" height="${n}" fill="#ffffff"/>` +
    `<path d="${d}" fill="#000000"/></svg>`
  );
}

/**
 * UPN QR → SVG. Po standardu: verzija 15 fiksno, Byte, ECC M (brez boost!),
 * ECI 000004, vsebina v ISO 8859-2.
 */
export function upnQrSvg(payload: string, border = 4): string {
  const segs = [
    qrcodegen.QrSegment.makeEci(4),
    qrcodegen.QrSegment.makeBytes(latin2Bytes(payload)),
  ];
  const qr = qrcodegen.QrCode.encodeSegments(segs, qrcodegen.QrCode.Ecc.MEDIUM, 15, 15, -1, false);
  return qrToSvg(qr, border, 'UPN QR plačilni nalog');
}

/** EPC (SEPA) QR → SVG. UTF-8, ECC M, verzija samodejno (≤ 13 pri naših dolžinah). */
export function epcQrSvg(payload: string, border = 4): string {
  const qr = qrcodegen.QrCode.encodeText(payload, qrcodegen.QrCode.Ecc.MEDIUM);
  return qrToSvg(qr, border, 'SEPA QR plačilni nalog');
}
