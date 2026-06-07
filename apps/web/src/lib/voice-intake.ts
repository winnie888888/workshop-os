'use client';

import { createLocalCollection, newId } from './local-store';

/*
 * Voice intake — domain types, an OFFLINE rule-based extractor, and persistence.
 *
 * The page only ever calls `processTranscript()` and `voiceStore`. To go live:
 *   - replace `processTranscript` with a real LLM call (api.ai.voiceExtract),
 *   - back `voiceStore` with API endpoints (POST/GET /voice-intakes).
 * The shape below IS the proposed API contract.
 */

export type VoicePriority = 'low' | 'normal' | 'high' | 'urgent';

export interface VoiceEntry {
  id: string;
  createdAt: string;
  transcript: string;
  summary: string;
  symptoms: string[];
  suggestedDiagnostics: string[];
  suggestedWorkItems: string[];
  suggestedParts: string[];
  priority: VoicePriority;
  mechanicNotes: string;
  workOrderId?: string;
  source: 'voice';
  status: 'draft' | 'saved' | 'linked' | 'error';
}

export const voiceStore = createLocalCollection<VoiceEntry>('wos.voice.entries.v1');

export const VOICE_DEMO_TRANSCRIPT =
  'Stranka pravi, da se pri zaviranju sliši kovinski zvok, vozilo trese nad 90 km/h, ' +
  'preveriti sprednje zavore, ležaje in optiko.';

export interface VoiceDraft {
  summary: string;
  symptoms: string[];
  suggestedDiagnostics: string[];
  suggestedWorkItems: string[];
  suggestedParts: string[];
  priority: VoicePriority;
  mechanicNotes: string;
}

export function priorityLabel(p: VoicePriority): string {
  return p === 'urgent' ? 'Nujno' : p === 'high' ? 'Visoka' : p === 'low' ? 'Nizka' : 'Običajna';
}

/*
 * OFFLINE extractor. Pure, deterministic-ish keyword mapping over the Slovenian
 * transcript — no network, no keys. Good enough to produce a realistic
 * structured proposal for the demo; a real model replaces this one function.
 */
export async function processTranscript(transcript: string): Promise<VoiceDraft> {
  await new Promise((r) => setTimeout(r, 600)); // simulate processing latency
  const t = transcript.toLowerCase();
  const has = (...kw: string[]) => kw.some((k) => t.includes(k));

  const symptoms: string[] = [];
  if (has('kovinsk', 'škrip', 'cvili', 'zvok', 'hrup', 'ropot', 'rožlja')) symptoms.push('Nenavaden zvok med vožnjo / zaviranjem');
  if (has('trese', 'vibrira', 'vibracij')) symptoms.push('Vibracije pri višjih hitrostih');
  if (has('zavir', 'zavor')) symptoms.push('Težave pri zaviranju');
  if (has('luč', 'optik', 'žaromet', 'meglenk')) symptoms.push('Težave z osvetlitvijo / optiko');
  if (has('olje', 'pušča', 'tekočin', 'kaplja')) symptoms.push('Možno puščanje tekočin');
  if (has('motor', 'ne vžge', 'zaganja', 'dim')) symptoms.push('Težave z motorjem / zagonom');
  if (has('menjalnik', 'sklopk', 'prestav')) symptoms.push('Težave z menjalnikom / sklopko');
  if (symptoms.length === 0) symptoms.push('Splošna pritožba stranke');

  const diagnostics: string[] = [];
  if (has('zavir', 'zavor')) diagnostics.push('Pregled zavornega sistema (ploščice, diski, čeljusti)');
  if (has('trese', 'vibrira')) diagnostics.push('Test vožnje in uravnoteženje koles');
  if (has('ležaj')) diagnostics.push('Pregled kolesnih ležajev');
  if (has('optik', 'luč', 'žaromet')) diagnostics.push('Pregled in nastavitev optike');
  if (has('motor', 'dim', 'ne vžge')) diagnostics.push('Diagnostika motorja (OBD)');
  if (diagnostics.length === 0) diagnostics.push('Splošni diagnostični pregled vozila');

  const work: string[] = [];
  if (has('zavor', 'zavir')) work.push('Servis sprednjih zavor');
  if (has('ležaj')) work.push('Pregled / menjava kolesnih ležajev');
  if (has('optik', 'luč')) work.push('Nastavitev optike');
  if (has('menjalnik', 'sklopk')) work.push('Pregled menjalnika / sklopke');
  if (work.length === 0) work.push('Delo po opravljeni diagnostiki');

  const parts: string[] = [];
  if (has('zavor', 'zavir')) { parts.push('Zavorne ploščice (sprednje)'); parts.push('Zavorni diski (sprednji)'); }
  if (has('ležaj')) parts.push('Kolesni ležaj (sprednji)');
  if (has('žarn', 'žaromet', 'luč')) parts.push('Avtožarnica');

  const priority: VoicePriority = has('nevarn', 'ne vžge', 'dim', 'ne zavira')
    ? 'urgent'
    : has('zavir', 'zavor')
      ? 'high'
      : 'normal';

  const clean = transcript.trim().replace(/\s+/g, ' ');
  const summary = clean.length > 0
    ? `Stranka poroča: ${clean.slice(0, 160)}${clean.length > 160 ? '…' : ''}`
    : 'Brez vsebine.';

  return {
    summary,
    symptoms,
    suggestedDiagnostics: diagnostics,
    suggestedWorkItems: work,
    suggestedParts: parts,
    priority,
    mechanicNotes: has('zavir', 'zavor')
      ? 'Pri prevzemu preveri tudi zavorno tekočino in obrabo zadnjih zavor.'
      : '',
  };
}

export function makeVoiceEntry(transcript: string, draft: VoiceDraft): VoiceEntry {
  return {
    id: newId('voice'),
    createdAt: new Date().toISOString(),
    transcript,
    ...draft,
    source: 'voice',
    status: 'draft',
  };
}
