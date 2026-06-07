/**
 * AI Gateway port (Architecture §2, Master Blueprint §5).
 *
 * Every AI capability in the platform goes through this gateway. The gateway
 * is provider-agnostic, enforces EU data residency, applies guardrails, and
 * logs provenance (every interaction + every suggestion->decision). It NEVER
 * commits to money/VAT/e-invoice/safety — callers persist approved suggestions
 * explicitly through the domain layer.
 */

export type AiFeature =
  | 'ocr.delivery_note'
  | 'voice.intake'
  | 'invoice.draft'
  | 'customer.dedup'
  | 'vat.classify'
  | 'history.summarize'
  | 'billing.anomaly'
  // Added by later phases (kept here so the feature type stays honest rather
  // than being bypassed with casts):
  | 'ocr_receiving'            // Phase 7: supplier-document extraction
  | 'plate_recognition'        // Phase 8: license-plate recognition
  | 'attendance_consistency'   // Phase 9: attendance vs work reconciliation narrative
  | 'voice_transcription'      // Phase 10: speech-to-text for voice work orders
  | 'voice_extraction'         // Phase 10: structured work-order extraction from a transcript
  | 'workshop_manager_summary'; // Phase 11: advisory narrative over computed insights

export interface AiRequest {
  feature: AiFeature;
  tenantId: string;
  userId: string | null;
  /** Natural-language or structured instruction for the model. */
  prompt: string;
  /** When true, the input contains personal data and must stay in the EU. */
  containsPii: boolean;
  /** Explicit override allowing non-EU processing under a signed DPA. */
  dpaAllowsNonEu?: boolean;
  /** Optional JSON schema name the model must conform its output to. */
  outputSchema?: string;
  /** Pointer to large input stored in object storage (e.g. a scanned note). */
  inputRef?: string;
}

export interface AiResult<T = unknown> {
  interactionId: string;
  output: T;
  model: string;
  confidence: number | null;
  residencyRegion: string;
}

/**
 * A reference to a document to extract from (Phase 5.0). The document is the
 * very attachment the warehouse clerk already uploaded through the Phase 4A
 * pipeline — so the storage key (and its mime type) is all the provider needs.
 * We never inline document bytes through the domain; large input stays in
 * object storage and is fetched by the adapter.
 */
export interface DocumentRef {
  /** Object-storage key of the stored document (PDF or image). */
  storageKey: string;
  /** MIME type, so the adapter sends the right modality (image/pdf). */
  mimeType: string;
  /** The originating attachment id, for the audit trail. */
  attachmentId: string | null;
}

/** What kind of paper we are extracting, so the prompt/schema can specialise. */
export type ExtractionDocumentType = 'delivery_note' | 'supplier_invoice';

export interface DocumentExtractionResult {
  /** Raw structured JSON the model produced, conforming to the output schema. */
  json: string;
  model: string;
  /** Overall confidence in the extraction, 0..1, or null if unknown. */
  confidence: number | null;
  latencyMs: number;
  costMicros: number | null;
}

/** Pluggable model provider. The gateway owns routing/fallback over providers. */
export interface LlmProvider {
  readonly name: string;
  readonly residencyRegion: string; // 'eu' | 'us' | ...
  complete(input: { prompt: string; outputSchema?: string }): Promise<{
    text: string;
    model: string;
    confidence: number | null;
    latencyMs: number;
    costMicros: number | null;
  }>;

  /**
   * Multimodal extraction (Phase 5.0): read a stored document and return
   * structured data conforming to `outputSchema`. This is the seam the whole
   * OCR future builds on — delivery notes and supplier invoices become draft
   * goods receipts a human confirms. Optional so a text-only provider can omit
   * it; the gateway checks support and the receiving flow falls back to manual
   * entry when extraction is unavailable. Implementations MUST honour the same
   * EU-residency guard as `complete`.
   */
  extractFromDocument?(input: {
    document: DocumentRef;
    documentType: ExtractionDocumentType;
    /** Instruction guiding what to pull out (line items, totals, supplier…). */
    prompt: string;
    /** JSON schema name the structured output must conform to. */
    outputSchema: string;
  }): Promise<DocumentExtractionResult>;

  /**
   * License-plate recognition (Phase 8). A plate is not a "document", so this is
   * a focused seam separate from extractFromDocument: the input is a vehicle/
   * plate PHOTO and the output is just the plate text, an optional country, and
   * a confidence. Optional, so a text-only provider can omit it; the recognition
   * flow falls back to manual plate entry when it is absent. Implementations MUST
   * honour the same EU-residency guard as `complete` — a vehicle photo can carry
   * PII (it may show people or a location).
   */
  recognizePlate?(input: {
    document: DocumentRef;
    /** Instruction guiding the read (single most prominent plate, country…). */
    prompt: string;
  }): Promise<PlateRecognitionResult>;

  /**
   * Speech-to-text (Phase 10). Turns an uploaded audio note into text. Optional,
   * so a provider without audio support can omit it; the voice flow surfaces a
   * clear "transcription unavailable" message and falls back to typing when it is
   * absent. Implementations MUST honour the same EU-residency guard as `complete`
   * — a spoken note can carry personal data (names, plates, locations). The
   * SUBSEQUENT field extraction is NOT a new seam: it is a `complete` call with a
   * work-order output schema, keeping speech-to-text and language-understanding
   * cleanly separate, exactly as the specification lists them.
   */
  transcribe?(input: {
    document: DocumentRef;
    /** Optional language hint ("sl", "en") to improve accuracy. */
    languageHint?: string | null;
    /** Optional instruction (e.g. domain vocabulary like part names). */
    prompt?: string;
  }): Promise<TranscriptionResult>;
}

/** What the provider returns for a transcription. */
export interface TranscriptionResult {
  /** The transcript text. */
  text: string;
  /** Detected/used language code, or null. */
  language: string | null;
  model: string;
  /** Confidence 0..1 in the transcription, or null if unknown. */
  confidence: number | null;
  latencyMs: number;
  costMicros: number | null;
}

/** What the provider returns for a single plate read. */
export interface PlateRecognitionResult {
  /** The plate text exactly as read (formatting preserved for the reviewer). */
  plate: string;
  /** ISO country code the model inferred (from the plate band/flag), or null. */
  country: string | null;
  model: string;
  /** Confidence 0..1 in the read, or null if unknown. */
  confidence: number | null;
  latencyMs: number;
  costMicros: number | null;
}

export const LLM_PROVIDER = 'LLM_PROVIDER';
