/**
 * Pure formatting helpers shared by every screen. Money always arrives from the
 * API as minor units in a string (bigint-safe), so all formatting starts there
 * and never does floating-point arithmetic on currency.
 */

/** Format minor units (e.g. "23729") in a currency (e.g. "EUR") as "€237.29". */
export function formatMoneyMinor(minor: string | number | bigint | null | undefined, currency = 'EUR'): string {
  if (minor === null || minor === undefined || minor === '') return '—';
  let n: bigint;
  try {
    n = typeof minor === 'bigint' ? minor : BigInt(typeof minor === 'number' ? Math.round(minor) : String(minor).trim());
  } catch { return '—'; }
  const neg = n < 0n;
  const abs = neg ? -n : n;
  const major = abs / 100n;
  const cents = abs % 100n;
  const body = `${major.toString()}.${cents.toString().padStart(2, '0')}`;
  const symbol = currency === 'EUR' ? '€' : `${currency} `;
  return `${neg ? '-' : ''}${symbol}${body}`;
}

/** Seconds -> "1h 23m" (or "0m"). For mechanic clocks and labour summaries. */
export function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return '0m';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Seconds -> "HH:MM:SS" for a live running timer. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((x) => x.toString().padStart(2, '0')).join(':');
}

/** Human label for a work-order status. */
export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    draft: 'Osnutek', open: 'Za izvedbo', in_progress: 'V delu', awaiting_approval: 'Čaka odobritev',
    awaiting_parts: 'Čaka dele', on_hold: 'Zadržano', ready: 'Pripravljeno', invoiced: 'Zaračunano',
    closed: 'Zaključeno', cancelled: 'Preklicano',
  };
  return map[status] ?? status;
}

/** Maps a status to a semantic colour token used across the UI. */
export function statusTone(status: string): 'go' | 'hold' | 'stop' | 'info' | 'neutral' {
  switch (status) {
    case 'ready': case 'invoiced': case 'closed': return 'go';
    case 'in_progress': case 'on_hold': return 'hold';
    case 'awaiting_approval': case 'awaiting_parts': return 'info';
    case 'cancelled': return 'stop';
    default: return 'neutral';
  }
}

/** Normalise a plate for display (uppercase, single dashes). */
export function displayPlate(plate: string): string {
  return plate.toUpperCase().replace(/\s+/g, '-');
}

/** Today's date as yyyy-mm-dd (local). */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
