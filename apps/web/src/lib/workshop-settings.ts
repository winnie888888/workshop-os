'use client';

/*
 * Workshop settings — a single-object localStorage store with an async API,
 * swap-ready for a real GET/PUT /settings endpoint later. Nothing here is
 * secret; API keys would be stored server-side in a real deployment (the fields
 * here are for demo configuration only).
 */

export interface WorkshopSettings {
  company: { name: string; address: string; vatId: string; iban: string };
  defaults: { vatRatePct: string; labourRateEur: string; currency: string };
  integrations: { minimaxEnabled: boolean; minimaxOrgId: string; smsEnabled: boolean; smsSender: string };
  ai: { sttProvider: 'browser' | 'external'; ocrProvider: 'demo' | 'external' };
}

const KEY = 'wos.settings.v1';

export const DEFAULT_SETTINGS: WorkshopSettings = {
  company: { name: 'A-SPRINT d.o.o.', address: '', vatId: '', iban: '' },
  defaults: { vatRatePct: '22', labourRateEur: '45', currency: 'EUR' },
  integrations: { minimaxEnabled: false, minimaxOrgId: '', smsEnabled: false, smsSender: 'A-SPRINT' },
  ai: { sttProvider: 'browser', ocrProvider: 'demo' },
};

export async function loadSettings(): Promise<WorkshopSettings> {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    // merge so new fields get defaults
    return {
      company: { ...DEFAULT_SETTINGS.company, ...parsed.company },
      defaults: { ...DEFAULT_SETTINGS.defaults, ...parsed.defaults },
      integrations: { ...DEFAULT_SETTINGS.integrations, ...parsed.integrations },
      ai: { ...DEFAULT_SETTINGS.ai, ...parsed.ai },
    };
  } catch { return DEFAULT_SETTINGS; }
}

export async function saveSettings(s: WorkshopSettings): Promise<void> {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

/**
 * Synchronous read of the default values (VAT %, labour rate, currency) for use
 * as initial form values. SSR-safe: returns DEFAULT_SETTINGS' defaults on the
 * server. This is the bridge that makes the Settings page actually feed new
 * work-order lines, packages and items — change a default once, and every new
 * line picks it up.
 */
export function readDefaultsSync(): { vatRatePct: string; labourRateEur: string; labourRateMinor: number; currency: string } {
  let parsed: any = null;
  if (typeof window !== 'undefined') {
    try { const raw = window.localStorage.getItem(KEY); parsed = raw ? JSON.parse(raw) : null; } catch { parsed = null; }
  }
  const d = { ...DEFAULT_SETTINGS.defaults, ...(parsed?.defaults ?? {}) };
  return {
    vatRatePct: d.vatRatePct || '22',
    labourRateEur: d.labourRateEur || '45',
    labourRateMinor: Math.round((parseFloat(d.labourRateEur) || 0) * 100),
    currency: d.currency || 'EUR',
  };
}
