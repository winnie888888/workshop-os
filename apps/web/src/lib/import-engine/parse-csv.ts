/*
 * CSV input adapter. Parses raw CSV text into a SourceTable. Dependency-free.
 *
 * - Auto-detects the delimiter (',', ';', tab, '|') from the header line.
 * - Handles quoted fields with embedded delimiters, newlines and escaped ("")
 *   quotes (RFC-4180 style).
 * - Strips a UTF-8 BOM and trims header names.
 * - Never evaluates cell content (values are plain strings), so spreadsheet
 *   formula injection is a non-issue on import; the exporter quotes on the way
 *   back out.
 *
 * XLSX, OCR, PDF, scan and API adapters will produce the same SourceTable shape
 * so the rest of the engine is source-agnostic.
 */
import type { SourceTable } from './types';

function detectDelimiter(headerLine: string): string {
  const candidates = [';', ',', '\t', '|'];
  let best = ',';
  let bestCount = -1;
  for (const d of candidates) {
    // Count delimiters outside quotes on the header line.
    let count = 0;
    let inQuotes = false;
    for (let i = 0; i < headerLine.length; i++) {
      const ch = headerLine[i];
      if (ch === '"') inQuotes = !inQuotes;
      else if (ch === d && !inQuotes) count++;
    }
    if (count > bestCount) { bestCount = count; best = d; }
  }
  return best;
}

/** Full RFC-4180-ish tokenizer over the whole text for a given delimiter. */
function tokenize(text: string, delim: string): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') { inQuotes = true; continue; }
    if (ch === delim) { row.push(field); field = ''; continue; }
    if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
    if (ch === '\r') { continue; }
    field += ch;
  }
  // Flush trailing field/row.
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

export interface ParseOptions { filename?: string; }

/** Parse CSV text into a SourceTable. */
export function parseCsv(input: string, opts: ParseOptions = {}): SourceTable {
  const text = String(input ?? '').replace(/^\ufeff/, ''); // strip BOM
  if (!text.trim()) return { columns: [], rows: [], meta: { filename: opts.filename, fileType: 'csv' } };

  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const delim = detectDelimiter(firstLine);
  const matrix = tokenize(text, delim).filter((r) => r.some((c) => c.trim() !== '')); // drop blank lines

  if (matrix.length === 0) return { columns: [], rows: [], meta: { filename: opts.filename, fileType: 'csv' } };

  // Header: trim, de-duplicate empties.
  const header = matrix[0].map((h, i) => {
    const name = h.trim();
    return name || `Stolpec ${i + 1}`;
  });

  const rows: Record<string, string>[] = [];
  for (let r = 1; r < matrix.length; r++) {
    const cells = matrix[r];
    const obj: Record<string, string> = {};
    header.forEach((col, i) => { obj[col] = (cells[i] ?? '').trim(); });
    rows.push(obj);
  }

  return { columns: header, rows, meta: { filename: opts.filename, fileType: 'csv' } };
}
