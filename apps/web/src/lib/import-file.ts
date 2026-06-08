/*
 * Browser file → SourceTable adapter for the import wizard.
 *
 * The framework-agnostic engine (import-engine) never touches the DOM or any
 * file-format library; this thin app-layer adapter turns a user-selected File
 * into the engine's SourceTable. CSV/TSV/TXT go through the dependency-free
 * parseCsv; XLSX/XLS/XLSM go through SheetJS. Adding a new source (OCR/PDF/API)
 * = adding a branch here — the rest of the pipeline is unchanged.
 *
 * Security: file type + size are validated up front; no formula or macro is
 * ever executed (SheetJS reads cell values only), and every cell is treated as
 * a string downstream.
 */
import * as XLSX from 'xlsx';
import { parseCsv, type SourceTable } from '@/lib/import-engine';

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB
const CSV_EXT = ['csv', 'tsv', 'txt'];
const XLSX_EXT = ['xlsx', 'xls', 'xlsm'];

function ext(name: string): string {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i + 1).toLowerCase() : '';
}

/** Read a user-selected file into a normalised SourceTable. */
export async function readFileToSourceTable(file: File): Promise<SourceTable> {
  if (file.size > MAX_BYTES) {
    throw new Error(`Datoteka je prevelika (${(file.size / 1024 / 1024).toFixed(1)} MB; največ 15 MB).`);
  }
  const e = ext(file.name);

  if (CSV_EXT.includes(e)) {
    const text = await file.text();
    const table = parseCsv(text);
    table.meta = { filename: file.name, fileType: e };
    return table;
  }

  if (XLSX_EXT.includes(e)) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array', cellDates: true });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) throw new Error('Excel datoteka nima nobenega lista.');
    const ws = wb.Sheets[sheetName];
    const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: '', raw: false }) as any[][];
    return aoaToTable(aoa, { filename: file.name, fileType: e, sheet: sheetName });
  }

  throw new Error(`Nepodprt tip datoteke ".${e}". Podprto: CSV, TSV, XLSX, XLS.`);
}

/** Turn an array-of-arrays (first row = header) into a SourceTable. */
function aoaToTable(aoa: any[][], meta: SourceTable['meta']): SourceTable {
  const headerRow: any[] = aoa.length > 0 ? aoa[0] : [];
  const columns: string[] = headerRow.map((h, i) => {
    const name = String(h ?? '').trim();
    return name || `Stolpec ${i + 1}`;
  });
  const rows: Record<string, string>[] = [];
  for (let r = 1; r < aoa.length; r++) {
    const cells: any[] = aoa[r] ?? [];
    if (!cells.some((c) => String(c ?? '').trim() !== '')) continue; // skip empty rows
    const obj: Record<string, string> = {};
    columns.forEach((col, i) => { obj[col] = String(cells[i] ?? '').trim(); });
    rows.push(obj);
  }
  return { columns, rows, meta };
}
