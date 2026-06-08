/*
 * Universal Import Engine — public surface.
 *
 * Framework-agnostic core: parse a source into a SourceTable, propose a column
 * mapping against an entity schema, (later) dry-run, then confirm via a sink.
 * Input adapters (CSV now; XLSX/OCR/PDF/scan/API later) and persistence sinks
 * (demo store now; DB later) plug into these contracts without a refactor.
 */
export * from './types';
export * from './normalize';
export * from './schemas';
export { ruleBasedMapper } from './mapper';
export { parseCsv } from './parse-csv';
export type { ParseOptions } from './parse-csv';
export { planImport } from './plan';

import type { ColumnMapper, ImportSchema } from './types';
import { IMPORT_SCHEMAS } from './schemas';
import { ruleBasedMapper } from './mapper';

/** Look up an entity's import schema by key. */
export function getSchema(entity: string): ImportSchema | undefined {
  return IMPORT_SCHEMAS.find((s) => s.entity === entity);
}

/** Compact list for entity pickers in the wizard. */
export const ENTITY_LIST: { entity: string; label: string; description?: string }[] =
  IMPORT_SCHEMAS.map((s) => ({ entity: s.entity, label: s.label, description: s.description }));

/**
 * The mapper the app uses by default. Swap or wrap this to add AI-assisted
 * mapping later (e.g. const aiMapper: ColumnMapper = (t, s) => merge(rule, ai)).
 */
export const defaultMapper: ColumnMapper = ruleBasedMapper;
