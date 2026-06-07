import { Injectable } from '@nestjs/common';
import type { LlmProvider, DocumentRef, ExtractionDocumentType } from './ai-gateway.port';

/**
 * Deterministic fixture provider (Phase 7). When no real model endpoint is
 * configured, this stands in for the multimodal provider so the WHOLE OCR
 * receiving flow — extract → match → draft → review → post — can be exercised
 * offline and in the mobile demo, without ever calling a network or a model.
 *
 * It returns a realistic A-SPRINT supplier delivery note: a Knorr-Bremse note
 * for a rear brake kit and an air filter. The confidences are deliberately
 * MIXED — one line price is low-confidence — so the human-review highlighting
 * has something genuine to flag. This is EU-resident by definition (it is local
 * code) and is marked as such so the residency guard is satisfied.
 *
 * It is real production source, not a mock in the pejorative sense: it conforms
 * to the same LlmProvider contract the HTTP provider does, and the gateway treats
 * it identically. It simply does not consult an external model.
 */
@Injectable()
export class FixtureLlmProvider implements LlmProvider {
  readonly name = 'fixture-llm';
  readonly residencyRegion = 'eu';

  async complete(input: { prompt: string; outputSchema?: string }): Promise<{
    text: string; model: string; confidence: number | null; latencyMs: number; costMicros: number | null;
  }> {
    // Voice work-order field extraction (Phase 10) routes through `complete` with
    // the 'voice_work_order' output schema. We return a structured extraction
    // that matches the transcript `transcribe()` produces below, so the whole
    // voice flow — record → transcribe → extract → draft → review → save — runs
    // offline. Every OTHER caller still gets the safe empty-JSON default.
    if (input.outputSchema === 'voice_work_order') {
      const extraction = {
        customerHint: 'Prevozi Kralj',
        vehicleHint: 'NM CK 418',
        complaint: 'Rear brakes squeal when braking and the pedal feels soft',
        workPerformed: 'Replaced rear brake pads and discs, bled the brake system',
        labourNotes: 'About two hours, rear caliper slider was seized and needed cleaning',
        recommendations: ['Front brake discs worn, replace at next service'],
        followUps: ['Call customer about front discs quote'],
        odometerKm: 412350,
      };
      return { text: JSON.stringify(extraction), model: 'fixture-extract-v1', confidence: 0.88, latencyMs: 6, costMicros: 0 };
    }
    // Text completion is not otherwise the focus of this provider; return empty
    // JSON so structured callers degrade safely rather than crash.
    return { text: '{}', model: 'fixture', confidence: null, latencyMs: 1, costMicros: 0 };
  }

  async extractFromDocument(input: {
    document: DocumentRef; documentType: ExtractionDocumentType; prompt: string; outputSchema: string;
  }): Promise<{ json: string; model: string; confidence: number | null; latencyMs: number; costMicros: number | null }> {
    void input.prompt; void input.outputSchema;

    // The structured shape mirrors what a real model is prompted to return:
    // a supplier block, document identifiers, a date, and line items — each
    // value carrying the text read and a confidence. European number/date
    // formats are used on purpose, so the shared normalizer is exercised.
    const extraction = {
      kind: input.documentType,
      supplier: { name: 'Knorr-Bremse d.o.o.', vatId: 'SI 1122 3344', confidence: 0.97 },
      documentNumber: { raw: 'DN-2026-04471', confidence: 0.96 },
      deliveryNoteNumber: { raw: 'DN-2026-04471', confidence: 0.96 },
      invoiceNumber: { raw: null, confidence: null },
      purchaseOrderRef: { raw: '2026-PO-100', confidence: 0.88 },
      date: { raw: '15.03.2026', confidence: 0.95 },
      totals: { net: { raw: '519,00', confidence: 0.9 }, gross: { raw: '633,18', confidence: 0.9 } },
      lines: [
        {
          supplierSku: { raw: 'K-1234', confidence: 0.98 },
          oemRef: { raw: '81.50820.6037', confidence: 0.93 },
          description: { raw: 'Bremsbelagsatz HA / Brake pad & disc kit rear axle', confidence: 0.94 },
          quantity: { raw: '2 kos', confidence: 0.97 },
          unitPrice: { raw: '240,00', confidence: 0.92 },
          lineTotal: { raw: '480,00', confidence: 0.9 },
          vatRate: { raw: '22 %', confidence: 0.95 },
        },
        {
          supplierSku: { raw: 'K-7780', confidence: 0.7 },
          oemRef: { raw: '81.08405.0011', confidence: 0.82 },
          description: { raw: 'Luftfilter / Air filter element', confidence: 0.9 },
          quantity: { raw: '1', confidence: 0.96 },
          // Deliberately low-confidence price — a smudged figure on the note —
          // so the reviewer sees a clearly-flagged field.
          unitPrice: { raw: '39,00', confidence: 0.41 },
          lineTotal: { raw: '39,00', confidence: 0.55 },
          vatRate: { raw: '22 %', confidence: 0.95 },
        },
      ],
    };

    return {
      json: JSON.stringify(extraction),
      model: 'fixture-extract-v1',
      confidence: 0.9,
      latencyMs: 5,
      costMicros: 0,
    };
  }

  /**
   * Deterministic plate recognition (Phase 8). Returns a realistic Slovenian
   * plate read that matches the seeded A-SPRINT vehicle (Prevozi Kralj's MAN,
   * plate NM CK-418), so the offline/demo flow shows a clean exact match through
   * to opening or creating the work order. Formatting is preserved (spaces/dash)
   * so the shared canonicaliser is exercised.
   */
  async recognizePlate(input: { document: DocumentRef; prompt: string }): Promise<{
    plate: string; country: string | null; model: string; confidence: number | null; latencyMs: number; costMicros: number | null;
  }> {
    void input.prompt;
    return { plate: 'NM CK-418', country: 'SI', model: 'fixture-plate-v1', confidence: 0.93, latencyMs: 4, costMicros: 0 };
  }

  /**
   * Deterministic speech-to-text (Phase 10). Returns a realistic mechanic's
   * spoken note whose content matches the structured extraction `complete()`
   * returns for the 'voice_work_order' schema, so the offline/demo voice flow is
   * internally consistent: this transcript, fed to extraction, yields that draft.
   * A natural, slightly rambling sentence — exactly what a mechanic would say.
   */
  async transcribe(input: { document: DocumentRef; languageHint?: string | null; prompt?: string }): Promise<{
    text: string; language: string | null; model: string; confidence: number | null; latencyMs: number; costMicros: number | null;
  }> {
    void input;
    const text =
      "Okay, this is for Prevozi Kralj, the MAN, plate November Mike Charlie Kilo four one eight. "
      + "Customer says the rear brakes squeal when braking and the pedal feels soft. "
      + "I replaced the rear brake pads and discs and bled the brake system, took about two hours, "
      + "the rear caliper slider was seized so I had to clean it. "
      + "Front brake discs are worn too, recommend replacing at the next service. "
      + "Follow up, call the customer about a quote for the front discs. Odometer is four hundred twelve thousand three fifty.";
    return { text, language: 'en', model: 'fixture-stt-v1', confidence: 0.9, latencyMs: 8, costMicros: 0 };
  }
}
