/*
 * Universal Import Engine — dry-run planner (step 2).
 *
 * Turns a raw SourceTable + an ImportSchema + a confirmed ColumnMapping[] into a
 * DryRunResult WITHOUT persisting anything. This is the safety gate the wizard
 * shows before "Uvozi": every row is type-coerced, validated, classified as
 * create / update / skip / error, and de-duplicated — both against records that
 * already exist (idempotent upsert by business key) and against earlier rows in
 * the same file.
 *
 * Pure + framework-agnostic (no React/Next/Nest, no I/O). The SAME function runs
 * in the browser (demo) and on the server (NestJS) later. Relation linking
 * (e.g. customerName → customerId) and the actual write happen at the confirm
 * step against a sink; the planner only inspects.
 */
import type {
  ColumnMapping,
  DryRunResult,
  FieldDef,
  FieldType,
  ImportSchema,
  RowOutcome,
  RowResult,
  SourceTable,
} from './types';
import { coerce, normEmail, normKey, normPhone, normPlate, normVatId } from './normalize';

const EMPTY = (v: unknown): boolean => v === undefined || v === null || v === '';

/** Type-aware normalisation for building a stable business-key signature. */
function normForKey(type: FieldType, value: any): string {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  const s = String(value ?? '');
  switch (type) {
    case 'vat_id': return normVatId(s);
    case 'plate': return normPlate(s);
    case 'email': return normEmail(s);
    case 'phone': return normPhone(s);
    case 'date': return s; // already ISO after coercion
    default: return normKey(s);
  }
}

interface KeyMatch { label: string; sig: string }

/**
 * Plan an import. `existing` are records already in the system whose properties
 * use the schema's internal field keys (the same keys the mapping targets); pass
 * them to get accurate create-vs-update classification, or omit for create-only.
 */
export function planImport(
  table: SourceTable,
  schema: ImportSchema,
  mapping: ColumnMapping[],
  existing?: Record<string, any>[],
): DryRunResult {
  const fieldByKey = new Map<string, FieldDef>(schema.fields.map((f) => [f.key, f]));

  // 1) Resolve the active column → field assignments from the confirmed mapping.
  const mapped: { col: string; field: FieldDef }[] = [];
  const mappedFieldKeys = new Set<string>();
  for (const m of mapping) {
    if (!m.targetField || m.ignored) continue;
    const field = fieldByKey.get(m.targetField);
    if (!field) continue; // mapping references an unknown field — ignore defensively
    mapped.push({ col: m.sourceColumn, field });
    mappedFieldKeys.add(field.key);
  }
  const mappedSourceCols = new Set(mapped.map((m) => m.col));

  // Schema-level diagnostics (independent of row data).
  const unmappedColumns = table.columns.filter((c) => !mappedSourceCols.has(c));
  const missingRequired = schema.fields
    .filter((f) => f.required && !mappedFieldKeys.has(f.key))
    .map((f) => f.key);

  // Build a signature for one upsert key-set over a record, or null if incomplete.
  const keyForSet = (rec: Record<string, any>, set: string[]): string | null => {
    const parts: string[] = [];
    for (const k of set) {
      const f = fieldByKey.get(k);
      const v = rec[k];
      if (!f || EMPTY(v)) return null;
      parts.push(normForKey(f.type, v));
    }
    return `${set.join('+')}=${parts.join('|')}`;
  };
  const completeKeys = (rec: Record<string, any>): KeyMatch[] =>
    schema.upsertKeys
      .map((set): KeyMatch | null => {
        const sig = keyForSet(rec, set);
        return sig === null ? null : { label: set.join(' + '), sig };
      })
      .filter((x): x is KeyMatch => x !== null);

  // 2) Index existing records under every business key they expose (for upsert).
  const existingIndex = new Map<string, string>(); // signature → matched key-set label
  if (existing && existing.length) {
    for (const rec of existing) {
      for (const km of completeKeys(rec)) {
        if (!existingIndex.has(km.sig)) existingIndex.set(km.sig, km.label);
      }
    }
  }

  // 3) Walk the rows.
  const rows: RowResult[] = [];
  const seenInFile = new Set<string>(); // every business key seen so far in THIS file
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let errored = 0;
  const keyHint = schema.upsertKeys.map((s) => s.join(' + ')).join(' / ');

  table.rows.forEach((row, index) => {
    const record: Record<string, any> = {};
    const errors: string[] = [];
    const warnings: string[] = [];

    // Coerce every mapped cell; keep the first non-empty value if a field repeats.
    for (const { col, field } of mapped) {
      const raw = row[col] ?? '';
      const { value, error } = coerce(field.type, raw);
      if (error) errors.push(`${field.label}: ${error}`);
      if (value !== null && field.type === 'enum' && field.enumValues && field.enumValues.length) {
        const ok = field.enumValues.some((ev) => normKey(ev) === normKey(String(value)));
        if (!ok) {
          errors.push(`${field.label}: nedovoljena vrednost "${value}" (dovoljeno: ${field.enumValues.join(', ')})`);
        }
      }
      if (EMPTY(record[field.key])) record[field.key] = value;
    }

    // Required fields must be present.
    for (const f of schema.fields) {
      if (f.required && EMPTY(record[f.key])) errors.push(`manjka obvezno polje: ${f.label}`);
    }

    // At least one full upsert key-set is required to import safely.
    const keys = completeKeys(record);
    if (keys.length === 0) {
      errors.push(`manjka ključ za uskladitev (potreben vsaj eden: ${keyHint})`);
    }

    if (errors.length) {
      rows.push({ index, outcome: 'error' as RowOutcome, record, errors, warnings });
      errored++;
      return;
    }

    // In-file duplicate: shares any business key with an earlier row in this file.
    const dup = keys.find((k) => seenInFile.has(k.sig));
    if (dup) {
      warnings.push(`podvojeno v datoteki (ujemanje po ${dup.label})`);
      rows.push({ index, outcome: 'skip' as RowOutcome, record, errors, warnings });
      skipped++;
      return;
    }
    for (const k of keys) seenInFile.add(k.sig);

    // Upsert: update if any business key already exists, else create.
    const hit = keys.find((k) => existingIndex.has(k.sig));
    if (hit) {
      rows.push({ index, outcome: 'update' as RowOutcome, record, matchedBy: existingIndex.get(hit.sig), errors, warnings });
      updated++;
    } else {
      rows.push({ index, outcome: 'create' as RowOutcome, record, errors, warnings });
      created++;
    }
  });

  return {
    entity: schema.entity,
    total: table.rows.length,
    created,
    updated,
    skipped,
    errored,
    rows,
    unmappedColumns,
    missingRequired,
  };
}
