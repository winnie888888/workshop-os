/*
 * Value normalisation + type coercion for the import engine.
 * Pure functions, no dependencies. Used by the mapper (header matching) and by
 * the dry-run planner (turning raw cell strings into typed, validated values).
 */
import type { FieldType } from './types';

/** Strip diacritics: "Šifra" → "Sifra". */
export function stripDiacritics(s: string): string {
  return String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Normalise a header/key for matching: lowercase, no diacritics, alnum only. */
export function normKey(s: string): string {
  return stripDiacritics(s).toLowerCase().replace(/[^a-z0-9]+/g, '');
}

/** Normalise a company name for fuzzy fallback matching (drop legal suffixes). */
export function normName(s: string): string {
  return stripDiacritics(s)
    .toLowerCase()
    .replace(/\b(d\.?\s*o\.?\s*o\.?|s\.?\s*p\.?|d\.?\s*d\.?|k\.?\s*d\.?|ltd|gmbh|llc|inc|s\.?r\.?l\.?)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function normVatId(s: string): string {
  return String(s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function normPlate(s: string): string {
  return String(s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function normEmail(s: string): string {
  return String(s ?? '').trim().toLowerCase();
}

export function normPhone(s: string): string {
  return String(s ?? '').replace(/[^\d+]/g, '');
}

/** Parse a number from messy input: "1.234,56", "1,234.56", "1234.56", "€38,00". */
export function parseNumber(s: string): number | null {
  let t = String(s ?? '').trim().replace(/[^\d.,-]/g, '');
  if (!t) return null;
  if (t.includes('.') && t.includes(',')) {
    // The separator that appears last is the decimal separator.
    if (t.lastIndexOf(',') > t.lastIndexOf('.')) t = t.replace(/\./g, '').replace(',', '.');
    else t = t.replace(/,/g, '');
  } else if (t.includes(',')) {
    const parts = t.split(',');
    // One comma with <=2 trailing digits → decimal; otherwise thousands sep.
    if (parts.length === 2 && parts[1].length <= 2) t = t.replace(',', '.');
    else t = t.replace(/,/g, '');
  }
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

/** Parse to integer minor units (cents): "38,00" → 3800. */
export function parseMoneyMinor(s: string): number | null {
  const n = parseNumber(s);
  return n === null ? null : Math.round(n * 100);
}

export function parseIntStrict(s: string): number | null {
  const n = parseNumber(s);
  return n === null ? null : Math.round(n);
}

export function parseBool(s: string): boolean | null {
  const t = String(s ?? '').trim().toLowerCase();
  if (!t) return null;
  if (['1', 'true', 'da', 'yes', 'y', 'aktiven', 'aktivno', 'active', 'x', '✓'].includes(t)) return true;
  if (['0', 'false', 'ne', 'no', 'n', 'neaktiven', 'neaktivno', 'inactive'].includes(t)) return false;
  return null;
}

/** Parse a date to ISO yyyy-mm-dd from dd.mm.yyyy / dd/mm/yyyy / ISO / etc. */
export function parseDateIso(s: string): string | null {
  const raw = String(s ?? '').trim();
  if (!raw) return null;
  const dmy = raw.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})$/);
  if (dmy) {
    let y = dmy[3];
    if (y.length === 2) y = '20' + y;
    return `${y}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  }
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dt = new Date(raw);
  return Number.isNaN(dt.getTime()) ? null : dt.toISOString().slice(0, 10);
}

/**
 * Coerce a raw cell string to the field's type. Returns { value } on success or
 * { value:null, error } on a type error. Empty input → { value:null } (no error;
 * required-ness is enforced separately by the planner).
 */
export function coerce(type: FieldType, raw: string): { value: any; error?: string } {
  const s = String(raw ?? '').trim();
  if (s === '') return { value: null };
  switch (type) {
    case 'string':
    case 'enum': return { value: s };
    case 'email': return { value: normEmail(s) };
    case 'phone': return { value: normPhone(s) };
    case 'vat_id': return { value: normVatId(s) };
    case 'plate': return { value: normPlate(s) };
    case 'number': { const n = parseNumber(s); return n === null ? { value: null, error: `ni število: "${raw}"` } : { value: n }; }
    case 'integer': { const n = parseIntStrict(s); return n === null ? { value: null, error: `ni celo število: "${raw}"` } : { value: n }; }
    case 'money': { const n = parseMoneyMinor(s); return n === null ? { value: null, error: `ni znesek: "${raw}"` } : { value: n }; }
    case 'boolean': { const b = parseBool(s); return b === null ? { value: null, error: `ni da/ne: "${raw}"` } : { value: b }; }
    case 'date': { const d = parseDateIso(s); return d === null ? { value: null, error: `ni veljaven datum: "${raw}"` } : { value: d }; }
    default: return { value: s };
  }
}
