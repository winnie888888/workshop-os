/**
 * Voice work orders — draft assembly & validation (Phase 10).
 *
 * The division of labour matters here, so let me be explicit about it. Two parts
 * of "voice work orders" are the MODEL's job and live in the AI gateway, not
 * here: turning audio into text (speech-to-text) and turning that free text into
 * rough structured fields (natural-language extraction). Both are inherently
 * non-deterministic, so they cannot be unit-tested by execution.
 *
 * What CAN be made deterministic — and therefore belongs here, tested — is
 * everything that happens AFTER the model has guessed at the fields:
 *
 *   1. Normalising the pieces it returned (e.g. a spoken plate "NM CK 418" or
 *      "en em tsej ka štiri ena osem" that the model wrote as text).
 *   2. Deciding INTENT: do these words describe a NEW job, or work performed on
 *      an EXISTING one? ("create a job for…" vs "I finished the brakes on…").
 *   3. Scoring COMPLETENESS and naming exactly what is missing, so the review
 *      screen can prompt the human for it rather than saving a hollow draft.
 *   4. Shaping recommendations and follow-ups into suggested work-order lines.
 *
 * Nothing here saves anything; it only turns a model guess into a reviewable
 * draft. Pure, dependency-free, tested by execution.
 */

import { canonicalPlate } from './plate-recognition';

// ---------------------------------------------------------------------------
// The raw shape the model is asked to produce from the transcript. Every field
// is optional and possibly empty, because speech is messy and the model will
// often only catch some of it. We never assume a field is present.
// ---------------------------------------------------------------------------

export interface VoiceExtraction {
  /** A customer name or hint the model heard ("Prevozi Kralj", "the Kralj account"). */
  customerHint?: string | null;
  /** A plate or vehicle hint the model heard ("NM CK 418", "the MAN"). */
  vehicleHint?: string | null;
  /** The customer's reported problem. */
  complaint?: string | null;
  /** What the mechanic says was done. */
  workPerformed?: string | null;
  /** Free labour notes (how long, what was awkward, etc.). */
  labourNotes?: string | null;
  /** Things the mechanic recommends (future work). */
  recommendations?: string[] | null;
  /** Explicit follow-up actions ("call customer about tyres next week"). */
  followUps?: string[] | null;
  /** An odometer reading if spoken. */
  odometerKm?: number | null;
}

export const VoiceIntent = {
  CreateNew: 'create_new',
  UpdateExisting: 'update_existing',
  Unclear: 'unclear',
} as const;
export type VoiceIntent = (typeof VoiceIntent)[keyof typeof VoiceIntent];

export interface SuggestedLine {
  type: 'labour' | 'part' | 'fee';
  description: string;
  /** Where this came from, so the reviewer understands the suggestion. */
  source: 'work_performed' | 'recommendation' | 'follow_up';
}

export interface WorkOrderDraft {
  intent: VoiceIntent;
  customerHint: string | null;
  vehicleHint: string | null;
  /** Canonicalised plate if the vehicle hint looked like a plate, else null. */
  plateCanonical: string | null;
  complaint: string | null;
  workPerformed: string | null;
  labourNotes: string | null;
  recommendations: string[];
  followUps: string[];
  odometerKm: number | null;
  suggestedLines: SuggestedLine[];
  /** 0..1 — how complete the draft is (drives whether we can fast-confirm). */
  completeness: number;
  /** Human-readable list of what is missing or unclear. */
  missing: string[];
  /** True when the draft is too thin to save without more input. */
  needsReview: boolean;
}

// ---------------------------------------------------------------------------
// Intent detection. We infer from the words whether this is a NEW job or work
// on an EXISTING one. This is a heuristic on the transcript, deliberately
// conservative: when the signals conflict or are absent we say "unclear" and let
// the human pick on the review screen, rather than guessing wrong and updating
// the wrong record.
// ---------------------------------------------------------------------------

const CREATE_CUES = [
  'new job', 'create a', 'create the', 'open a', 'open the', 'start a', 'start the',
  'book in', 'booking in', 'customer says', 'complains', 'complaint', 'brought in',
  // Slovenian cues
  'nov nalog', 'odpri', 'stranka pravi', 'pripeljal',
];
const UPDATE_CUES = [
  'finished', 'completed', 'i did', "i've done", 'i have done', 'replaced', 'fixed',
  'add to', 'on the existing', 'work order number', 'wo number', 'job number',
  // Slovenian cues
  'končal', 'zamenjal', 'popravil', 'dokončal', 'naredil',
];

/** Infer create-vs-update intent from the raw transcript text. */
export function detectIntent(transcript: string): VoiceIntent {
  const t = transcript.toLowerCase();
  let create = 0;
  let update = 0;
  for (const c of CREATE_CUES) if (t.includes(c)) create++;
  for (const c of UPDATE_CUES) if (t.includes(c)) update++;
  if (create > update) return VoiceIntent.CreateNew;
  if (update > create) return VoiceIntent.UpdateExisting;
  return VoiceIntent.Unclear;
}

// ---------------------------------------------------------------------------
// Plate hint normalisation. If the vehicle hint looks like a plate (mostly
// alphanumerics of plate length once stripped), canonicalise it so the matcher
// can compare it; otherwise leave it as a descriptive hint ("the white MAN").
// ---------------------------------------------------------------------------

export function normalizeVehicleHint(hint: string | null | undefined): string | null {
  if (!hint) return null;
  const canon = canonicalPlate(hint);
  // A plausible plate is 4..9 alphanumerics, and the original was mostly plate-y
  // (few spaces/words). Anything longer/wordier is a description, not a plate.
  const wordCount = hint.trim().split(/\s+/).length;
  if (canon.length >= 4 && canon.length <= 9 && wordCount <= 4) return canon;
  return null;
}

// ---------------------------------------------------------------------------
// Draft assembly. Turn the model's extraction + the raw transcript into a
// validated, scored draft. Completeness is weighted toward the fields that make
// a work order actionable; "missing" names what to ask the human for.
// ---------------------------------------------------------------------------

export function assembleDraft(extraction: VoiceExtraction, transcript: string): WorkOrderDraft {
  const intent = detectIntent(transcript);
  const recommendations = cleanList(extraction.recommendations);
  const followUps = cleanList(extraction.followUps);

  const suggestedLines: SuggestedLine[] = [];
  if (nonEmpty(extraction.workPerformed)) {
    suggestedLines.push({ type: 'labour', description: extraction.workPerformed!.trim(), source: 'work_performed' });
  }
  for (const r of recommendations) suggestedLines.push({ type: 'labour', description: r, source: 'recommendation' });

  // Completeness: weight the fields that matter most. A draft with a customer, a
  // vehicle, and either a complaint (new job) or work performed (update) is
  // actionable; missing any of those lowers the score and is named.
  const missing: string[] = [];
  let score = 0;
  if (nonEmpty(extraction.customerHint)) score += 0.3; else missing.push('customer');
  if (nonEmpty(extraction.vehicleHint)) score += 0.3; else missing.push('vehicle');

  const hasComplaint = nonEmpty(extraction.complaint);
  const hasWork = nonEmpty(extraction.workPerformed);
  if (intent === VoiceIntent.UpdateExisting) {
    if (hasWork) score += 0.4; else missing.push('work performed');
  } else {
    // create_new or unclear: a complaint is what opens a job
    if (hasComplaint) score += 0.4; else missing.push('complaint');
  }

  const completeness = Math.min(1, Math.round(score * 100) / 100);
  const needsReview = completeness < 0.9 || intent === VoiceIntent.Unclear;

  return {
    intent,
    customerHint: orNull(extraction.customerHint),
    vehicleHint: orNull(extraction.vehicleHint),
    plateCanonical: normalizeVehicleHint(extraction.vehicleHint),
    complaint: orNull(extraction.complaint),
    workPerformed: orNull(extraction.workPerformed),
    labourNotes: orNull(extraction.labourNotes),
    recommendations,
    followUps,
    odometerKm: typeof extraction.odometerKm === 'number' && extraction.odometerKm >= 0 ? extraction.odometerKm : null,
    suggestedLines,
    completeness,
    missing,
    needsReview,
  };
}

// ---- small helpers --------------------------------------------------------

function nonEmpty(s: string | null | undefined): boolean { return typeof s === 'string' && s.trim().length > 0; }
function orNull(s: string | null | undefined): string | null { return nonEmpty(s) ? s!.trim() : null; }
function cleanList(xs: string[] | null | undefined): string[] {
  if (!Array.isArray(xs)) return [];
  return xs.map((x) => (typeof x === 'string' ? x.trim() : '')).filter((x) => x.length > 0);
}
