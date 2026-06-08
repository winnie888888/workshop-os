/*
 * Client-side data export helpers — dependency-free.
 *
 * Part of the "total import/export" pillar. These turn arrays of records into
 * downloadable files in the browser, with no extra libraries:
 *   - CSV (semicolon-separated + UTF-8 BOM, so Slovenian Excel opens č/š/ž and
 *     columns correctly out of the box),
 *   - JSON (the full portability archive).
 *
 * Nested values (e.g. work-order lines) are serialised as JSON inside the cell
 * so no data is lost; richer per-line CSVs and an XLSX/ZIP archive come later.
 */

/** Collect the union of keys across rows, in first-seen order. */
function unionKeys(rows: any[]): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (row && typeof row === 'object') {
      for (const k of Object.keys(row)) {
        if (!seen.has(k)) { seen.add(k); keys.push(k); }
      }
    }
  }
  return keys;
}

/** Render a single cell value to a string (objects/arrays → compact JSON). */
function cell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    try { return JSON.stringify(value); } catch { return String(value); }
  }
  return String(value);
}

/** Quote a field for CSV: wrap in double quotes, double any internal quotes. */
function quote(s: string): string {
  return `"${s.replace(/"/g, '""')}"`;
}

/** Convert an array of records to a semicolon-separated CSV string. */
export function toCsv(rows: any[]): string {
  if (!rows || rows.length === 0) return '';
  const keys = unionKeys(rows);
  const head = keys.map(quote).join(';');
  const body = rows.map((row) => keys.map((k) => quote(cell(row?.[k]))).join(';')).join('\r\n');
  return `${head}\r\n${body}`;
}

/** Trigger a browser download of arbitrary text content. */
export function downloadText(filename: string, text: string, mime: string): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on the next tick so the download has started.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Download an array of records as a CSV file (UTF-8 BOM for Excel). */
export function downloadCsv(filename: string, rows: any[]): void {
  downloadText(filename, '\ufeff' + toCsv(rows), 'text/csv;charset=utf-8');
}

/** Download any object as a pretty-printed JSON file. */
export function downloadJson(filename: string, obj: unknown): void {
  downloadText(filename, JSON.stringify(obj, null, 2), 'application/json;charset=utf-8');
}

/** Today's date as YYYY-MM-DD, for filenames. */
export function dateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}
