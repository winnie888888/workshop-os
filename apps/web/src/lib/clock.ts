'use client';

/**
 * Local active-clock store. The mechanic's running timer must start the instant
 * they tap "Start work" and keep ticking even with no signal, so the source of
 * truth for the *timer display* is local: clock-on records the start time here,
 * clock-off clears it. The server-side time entry (created via the sync queue)
 * is the system of record for payroll; this is just the responsive UI mirror,
 * reconciled from the server when a fresh work-order detail is available.
 */

const KEY = 'wos.activeClocks';

type ActiveClocks = Record<string, string>; // workOrderId -> ISO start time

function load(): ActiveClocks {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? '{}') as ActiveClocks;
  } catch {
    return {};
  }
}

function save(c: ActiveClocks): void {
  if (typeof window !== 'undefined') window.localStorage.setItem(KEY, JSON.stringify(c));
}

export function startClock(workOrderId: string, startedAt = new Date().toISOString()): void {
  const c = load();
  c[workOrderId] = startedAt;
  save(c);
}

export function stopClock(workOrderId: string): void {
  const c = load();
  delete c[workOrderId];
  save(c);
}

export function clockStartedAt(workOrderId: string): string | null {
  return load()[workOrderId] ?? null;
}

/** Any work order this device currently has a running clock on. */
export function anyActiveClock(): { workOrderId: string; startedAt: string } | null {
  const c = load();
  const ids = Object.keys(c);
  if (ids.length === 0) return null;
  return { workOrderId: ids[0], startedAt: c[ids[0]] };
}

/** Reconcile local state from a server detail's open time entry for this user. */
export function reconcileFromServer(workOrderId: string, openStartedAt: string | null): void {
  if (openStartedAt) startClock(workOrderId, openStartedAt);
  else stopClock(workOrderId);
}
