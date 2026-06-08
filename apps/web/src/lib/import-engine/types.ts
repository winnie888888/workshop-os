/*
 * Universal Import Engine — core type contracts.
 *
 * This module is framework-agnostic (no React / Next / Nest imports) so the
 * exact same engine runs in the browser (demo) and on the server (NestJS)
 * later, and so it can be promoted to packages/shared without changes.
 *
 * Data flows: SOURCE (CSV/XLSX/OCR/PDF/scan/API) → adapter → SourceTable →
 * mapper → ColumnMapping[] → dry-run planner → DryRunResult → confirm → sink
 * (demo store / DB). Adapters and sinks are pluggable; the core never persists.
 */

export type FieldType =
  | 'string' | 'number' | 'integer' | 'money' | 'boolean' | 'date'
  | 'enum' | 'vat_id' | 'plate' | 'email' | 'phone';

/** A single internal field an entity can receive. */
export interface FieldDef {
  /** Internal field key, e.g. 'plate', 'vatId', 'priceMinor'. */
  key: string;
  /** Human label (Slovenian). */
  label: string;
  type: FieldType;
  /** Header synonyms used for rule-based mapping (matched normalised). */
  synonyms: string[];
  /** Whether the field must be present (non-empty) for a row to import. */
  required?: boolean;
  /** Allowed values for type 'enum' (matched case-insensitively). */
  enumValues?: string[];
  description?: string;
}

/** Rule for linking this entity's row to another entity during import. */
export interface RelationRule {
  /** Field on THIS entity that carries the relation value (e.g. 'customerName'). */
  sourceField: string;
  /** Target entity key (e.g. 'companies', 'vehicles', 'drivers'). */
  targetEntity: string;
  /** Target keys to match on, in priority order (e.g. ['vatId','name']). */
  matchBy: string[];
  /** Field on THIS entity to set with the resolved id (e.g. 'customerId'). */
  assignField: string;
  /** Create the target if not found and enough data is present. */
  createIfMissing?: boolean;
  note?: string;
}

/** The full import contract for one entity. */
export interface ImportSchema {
  /** Entity key, e.g. 'vehicles' | 'companies' | 'products' | 'invoices'. */
  entity: string;
  /** Human label (Slovenian), e.g. 'Vozila'. */
  label: string;
  /** Short description for the wizard. */
  description?: string;
  fields: FieldDef[];
  /**
   * Business keys for idempotent upsert, in priority order. The first key-set
   * whose fields are ALL present is used to match an existing record. A row
   * with none of these present cannot be safely imported.
   */
  upsertKeys: string[][];
  relations?: RelationRule[];
}

/** A normalised tabular source produced by an input adapter. */
export interface SourceTable {
  /** Detected header column names (raw, as in the file). */
  columns: string[];
  /** Rows keyed by raw column name; all values are strings. */
  rows: Record<string, string>[];
  meta?: { filename?: string; fileType?: string; sheet?: string };
}

/** Proposed (and ultimately confirmed) mapping for one source column. */
export interface ColumnMapping {
  sourceColumn: string;
  /** Internal field key, or null when unmapped/ignored. */
  targetField: string | null;
  /** 0..1 confidence of the proposal. */
  confidence: number;
  /** Human explanation (Slovenian) of why this mapping was proposed. */
  reason: string;
  /** Whether the proposed target field is required. */
  required: boolean;
  /** A few example values from the column (for the UI). */
  sampleValues: string[];
  /** Explicitly ignored by the user (kept distinct from "no match"). */
  ignored?: boolean;
}

export interface MappingProposal {
  entity: string;
  columns: ColumnMapping[];
  /** Required field keys not covered by any mapping. */
  missingRequired: string[];
}

/** A pluggable column mapper (rule-based now, AI-assisted later). */
export type ColumnMapper = (table: SourceTable, schema: ImportSchema) => MappingProposal;

export type RowOutcome = 'create' | 'update' | 'skip' | 'error';

export interface RowResult {
  /** Source row index (0-based, excluding the header). */
  index: number;
  outcome: RowOutcome;
  /** Normalised, type-coerced record (internal field keys → values). */
  record: Record<string, any>;
  /** Which upsert key-set matched an existing record (for 'update'). */
  matchedBy?: string;
  errors: string[];
  warnings: string[];
}

export interface DryRunResult {
  entity: string;
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errored: number;
  rows: RowResult[];
  /** Source columns that were left unmapped. */
  unmappedColumns: string[];
  /** Required field keys with no mapped column. */
  missingRequired: string[];
}
