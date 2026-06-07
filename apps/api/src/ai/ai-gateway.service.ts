import { ForbiddenException, Inject, Injectable, Logger } from '@nestjs/common';
import { newId } from '@workshop/shared';
import { PgService, type TxClient } from '../common/db/pg.service';
import { AppConfig } from '../config/configuration';
import {
  LLM_PROVIDER, type AiRequest, type AiResult, type LlmProvider,
  type DocumentRef, type ExtractionDocumentType,
} from './ai-gateway.port';

/**
 * The single guarded entry point for AI in the platform (Master Blueprint §5).
 *
 * Responsibilities:
 *   - EU residency guard: refuse to send PII to a non-EU provider unless a
 *     signed DPA explicitly allows it.
 *   - Provenance: log every interaction to app.ai_interactions.
 *   - Suggestions: record AI output as a suggestion that a human must accept,
 *     edit, or reject. AI NEVER auto-commits money/VAT/e-invoice/safety.
 */
@Injectable()
export class AiGatewayService {
  private readonly logger = new Logger('AiGateway');

  constructor(
    private readonly pg: PgService,
    private readonly config: AppConfig,
    @Inject(LLM_PROVIDER) private readonly provider: LlmProvider,
  ) {}

  /** Run an AI feature with guardrails and provenance logging. */
  async run<T = unknown>(req: AiRequest): Promise<AiResult<T>> {
    this.enforceResidency(req);

    const result = await this.provider.complete({
      prompt: req.prompt,
      outputSchema: req.outputSchema,
    });

    let output: unknown = result.text;
    if (req.outputSchema) {
      output = this.parseStructured(result.text);
    }

    const interactionId = newId();
    await this.pg.withTenant(req.tenantId, (tx) =>
      tx.query(
        `INSERT INTO app.ai_interactions
           (id, tenant_id, feature, user_id, model, residency_region,
            input_ref, output, confidence, latency_ms, cost_micros)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          interactionId, req.tenantId, req.feature, req.userId, result.model,
          this.provider.residencyRegion, req.inputRef ?? null,
          JSON.stringify(output), result.confidence, result.latencyMs, result.costMicros,
        ],
      ),
    );

    return {
      interactionId,
      output: output as T,
      model: result.model,
      confidence: result.confidence,
      residencyRegion: this.provider.residencyRegion,
    };
  }

  /**
   * Multimodal document extraction (Phase 7). Reads a stored delivery note or
   * supplier invoice and returns the model's structured JSON, applying the SAME
   * residency guard and the SAME provenance logging as `run()`. Two honest
   * boundaries are enforced here:
   *   - If the configured provider cannot do multimodal extraction, we throw a
   *     clear, catchable error so the receiving flow falls back to manual entry
   *     rather than silently degrading.
   *   - This method only READS and RECORDS. It never creates a goods receipt or
   *     touches stock; the OCR service composes this with the existing draft
   *     workflow, and a human still confirms before anything is posted.
   *
   * The returned `json` is the raw model output; turning it into clean values
   * and matches is the job of the shared OCR core, not the gateway.
   */
  async extractFromDocument(req: {
    tenantId: string;
    userId: string | null;
    feature: string;
    documentType: ExtractionDocumentType;
    document: DocumentRef;
    prompt: string;
    outputSchema: string;
    /** A scanned supplier document is PII-bearing (names, addresses). */
    containsPii?: boolean;
    dpaAllowsNonEu?: boolean;
  }): Promise<{ interactionId: string; json: string; model: string; confidence: number | null; residencyRegion: string }> {
    // Reuse the residency guard: a supplier document carries PII by default.
    this.enforceResidency({
      tenantId: req.tenantId, userId: req.userId, feature: req.feature, prompt: req.prompt,
      containsPii: req.containsPii ?? true, dpaAllowsNonEu: req.dpaAllowsNonEu,
    } as AiRequest);

    if (typeof this.provider.extractFromDocument !== 'function') {
      // The provider is text-only; the caller must fall back to manual entry.
      throw new Error('document extraction not supported by the configured AI provider');
    }

    const result = await this.provider.extractFromDocument({
      document: req.document,
      documentType: req.documentType,
      prompt: req.prompt,
      outputSchema: req.outputSchema,
    });

    // Provenance: log the interaction exactly like a completion, with the
    // attachment id as the input reference so the audit trail points back at
    // the photographed document.
    const interactionId = newId();
    await this.pg.withTenant(req.tenantId, (tx) =>
      tx.query(
        `INSERT INTO app.ai_interactions
           (id, tenant_id, feature, user_id, model, residency_region,
            input_ref, output, confidence, latency_ms, cost_micros)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          interactionId, req.tenantId, req.feature, req.userId, result.model,
          this.provider.residencyRegion, req.document.attachmentId,
          result.json, result.confidence, result.latencyMs, result.costMicros,
        ],
      ),
    );

    return {
      interactionId, json: result.json, model: result.model,
      confidence: result.confidence, residencyRegion: this.provider.residencyRegion,
    };
  }

  /**
   * License-plate recognition (Phase 8). Mirrors extractFromDocument: the SAME
   * residency guard and the SAME provenance logging into ai_interactions, with
   * the attachment id as the input reference so the audit trail points at the
   * photographed plate. It only READS and RECORDS; it never creates or opens a
   * work order. If the provider cannot recognize plates, this throws a clear,
   * catchable error so the flow falls back to manual plate entry.
   */
  async recognizePlate(req: {
    tenantId: string;
    userId: string | null;
    feature: string;
    document: DocumentRef;
    prompt: string;
    containsPii?: boolean;
    dpaAllowsNonEu?: boolean;
  }): Promise<{ interactionId: string; plate: string; country: string | null; model: string; confidence: number | null; residencyRegion: string }> {
    // A vehicle photo may show people/location, so treat it as PII by default.
    this.enforceResidency({
      tenantId: req.tenantId, userId: req.userId, feature: req.feature, prompt: req.prompt,
      containsPii: req.containsPii ?? true, dpaAllowsNonEu: req.dpaAllowsNonEu,
    } as AiRequest);

    if (typeof this.provider.recognizePlate !== 'function') {
      throw new Error('plate recognition not supported by the configured AI provider');
    }

    const result = await this.provider.recognizePlate({ document: req.document, prompt: req.prompt });

    const interactionId = newId();
    await this.pg.withTenant(req.tenantId, (tx) =>
      tx.query(
        `INSERT INTO app.ai_interactions
           (id, tenant_id, feature, user_id, model, residency_region,
            input_ref, output, confidence, latency_ms, cost_micros)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          interactionId, req.tenantId, req.feature, req.userId, result.model,
          this.provider.residencyRegion, req.document.attachmentId,
          JSON.stringify({ plate: result.plate, country: result.country }),
          result.confidence, result.latencyMs, result.costMicros,
        ],
      ),
    );

    return {
      interactionId, plate: result.plate, country: result.country, model: result.model,
      confidence: result.confidence, residencyRegion: this.provider.residencyRegion,
    };
  }

  /**
   * Speech-to-text (Phase 10). Mirrors recognizePlate exactly: the SAME residency
   * guard and the SAME provenance logging into ai_interactions, with the audio
   * attachment id as the input reference. A spoken note can carry personal data
   * (names, plates, locations), so we treat it as PII by default. It only READS
   * and RECORDS; it never creates or updates a work order. If the provider cannot
   * transcribe, this throws a clear, catchable error so the flow falls back to
   * typing.
   */
  async transcribe(req: {
    tenantId: string;
    userId: string | null;
    feature: string;
    document: DocumentRef;
    languageHint?: string | null;
    prompt?: string;
    containsPii?: boolean;
    dpaAllowsNonEu?: boolean;
  }): Promise<{ interactionId: string; text: string; language: string | null; model: string; confidence: number | null; residencyRegion: string }> {
    this.enforceResidency({
      tenantId: req.tenantId, userId: req.userId, feature: req.feature, prompt: req.prompt ?? 'transcribe',
      containsPii: req.containsPii ?? true, dpaAllowsNonEu: req.dpaAllowsNonEu,
    } as AiRequest);

    if (typeof this.provider.transcribe !== 'function') {
      throw new Error('speech-to-text not supported by the configured AI provider');
    }

    const result = await this.provider.transcribe({
      document: req.document, languageHint: req.languageHint ?? null, prompt: req.prompt,
    });

    const interactionId = newId();
    await this.pg.withTenant(req.tenantId, (tx) =>
      tx.query(
        `INSERT INTO app.ai_interactions
           (id, tenant_id, feature, user_id, model, residency_region,
            input_ref, output, confidence, latency_ms, cost_micros)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          interactionId, req.tenantId, req.feature, req.userId, result.model,
          this.provider.residencyRegion, req.document.attachmentId,
          // The transcript itself is the output; store it so the audit trail is
          // complete (it is the human-confirmed source of the eventual record).
          JSON.stringify({ text: result.text, language: result.language }),
          result.confidence, result.latencyMs, result.costMicros,
        ],
      ),
    );

    return {
      interactionId, text: result.text, language: result.language, model: result.model,
      confidence: result.confidence, residencyRegion: this.provider.residencyRegion,
    };
  }

  /** Persist an AI suggestion for human review (pending until decided). */
  async recordSuggestion(
    tx: TxClient,
    params: {
      tenantId: string;
      interactionId: string;
      targetEntityType: string;
      targetEntityId: string | null;
      suggestedPayload: unknown;
    },
  ): Promise<string> {
    const id = newId();
    await tx.query(
      `INSERT INTO app.ai_suggestions
         (id, tenant_id, interaction_id, target_entity_type, target_entity_id, suggested_payload)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        id, params.tenantId, params.interactionId, params.targetEntityType,
        params.targetEntityId, JSON.stringify(params.suggestedPayload),
      ],
    );
    return id;
  }

  /** Record the human decision on a suggestion (accept/edit/reject). */
  async recordDecision(
    tx: TxClient,
    params: { suggestionId: string; decision: 'accepted' | 'edited' | 'rejected'; decidedBy: string | null },
  ): Promise<void> {
    await tx.query(
      `UPDATE app.ai_suggestions
          SET decision = $2, decided_by = $3, decided_at = now()
        WHERE id = $1`,
      [params.suggestionId, params.decision, params.decidedBy],
    );
  }

  private enforceResidency(req: AiRequest): void {
    const region = this.provider.residencyRegion;
    if (req.containsPii && region !== 'eu' && !req.dpaAllowsNonEu) {
      throw new ForbiddenException(
        `AI request blocked: PII may not leave the EU (provider region=${region})`,
      );
    }
    if (this.config.aiResidency === 'eu' && region !== 'eu' && req.containsPii && !req.dpaAllowsNonEu) {
      throw new ForbiddenException('AI residency policy violation');
    }
  }

  private parseStructured(text: string): unknown {
    // Providers are prompted to return strict JSON. Strip code fences if present.
    const cleaned = text.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      this.logger.warn('AI structured output was not valid JSON; returning raw text');
      return { _unparsed: text };
    }
  }
}
