/*
 * Column mapper. Proposes, for each source column, the best internal field with
 * a confidence score and a human reason. Rule-based now (synonym dictionary +
 * normalised matching); the ColumnMapper signature lets an AI-assisted mapper
 * be swapped in or layered on later without touching callers.
 */
import type { ColumnMapper, ColumnMapping, ImportSchema, MappingProposal, SourceTable } from './types';
import { normKey } from './normalize';

/** Up to `n` non-empty sample values for a column. */
function samples(table: SourceTable, column: string, n = 3): string[] {
  const out: string[] = [];
  for (const row of table.rows) {
    const v = (row[column] ?? '').trim();
    if (v) out.push(v);
    if (out.length >= n) break;
  }
  return out;
}

/** Score how well a header matches a field. Returns { score, reason }. */
function scoreField(headerNorm: string, field: { key: string; label: string; synonyms: string[] }): { score: number; reason: string } {
  if (!headerNorm) return { score: 0, reason: '' };
  const keyNorm = normKey(field.key);
  const labelNorm = normKey(field.label);
  const synNorms = field.synonyms.map(normKey);

  if (headerNorm === keyNorm) return { score: 1, reason: 'natančno ime polja' };
  if (synNorms.includes(headerNorm)) return { score: 0.96, reason: 'natančen sinonim' };
  if (headerNorm === labelNorm) return { score: 0.92, reason: 'ujemanje z oznako polja' };

  // Substring matches (either direction) — weaker.
  let best = 0;
  for (const s of [keyNorm, labelNorm, ...synNorms]) {
    if (!s || s.length < 3) continue;
    if (headerNorm.includes(s) || s.includes(headerNorm)) {
      const ratio = Math.min(headerNorm.length, s.length) / Math.max(headerNorm.length, s.length);
      best = Math.max(best, 0.55 + 0.2 * ratio);
    }
  }
  return best > 0 ? { score: Math.min(best, 0.85), reason: 'delno ujemanje' } : { score: 0, reason: '' };
}

/**
 * Rule-based mapping. Each column gets its best field; if two columns claim the
 * same field, the higher-confidence one keeps it and the other is left unmapped.
 */
export const ruleBasedMapper: ColumnMapper = (table: SourceTable, schema: ImportSchema): MappingProposal => {
  // Step 1: best candidate per column.
  const candidates: ColumnMapping[] = table.columns.map((col) => {
    const headerNorm = normKey(col);
    let bestField: string | null = null;
    let bestScore = 0;
    let bestReason = 'ni samodejnega ujemanja';
    for (const field of schema.fields) {
      const { score, reason } = scoreField(headerNorm, field);
      if (score > bestScore) { bestScore = score; bestField = field.key; bestReason = reason; }
    }
    const fieldDef = schema.fields.find((f) => f.key === bestField);
    return {
      sourceColumn: col,
      targetField: bestScore >= 0.5 ? bestField : null,
      confidence: bestScore >= 0.5 ? Number(bestScore.toFixed(2)) : 0,
      reason: bestScore >= 0.5 ? bestReason : 'ni samodejnega ujemanja',
      required: !!fieldDef?.required && bestScore >= 0.5,
      sampleValues: samples(table, col),
    };
  });

  // Step 2: resolve collisions, highest-confidence column keeps a field.
  const bestByField = new Map<string, ColumnMapping>();
  for (const c of candidates) {
    if (!c.targetField) continue;
    const cur = bestByField.get(c.targetField);
    if (!cur || c.confidence > cur.confidence) bestByField.set(c.targetField, c);
  }
  for (const c of candidates) {
    if (c.targetField && bestByField.get(c.targetField) !== c) {
      c.targetField = null;
      c.confidence = 0;
      c.required = false;
      c.reason = 'polje je že mapirano iz drugega stolpca';
    }
  }

  const mappedFields = new Set(candidates.filter((c) => c.targetField).map((c) => c.targetField));
  const missingRequired = schema.fields.filter((f) => f.required && !mappedFields.has(f.key)).map((f) => f.key);

  return { entity: schema.entity, columns: candidates, missingRequired };
};
