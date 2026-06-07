'use client';

import { api } from './api';
import { getSession } from './session';

/**
 * Offline mutation queue (Mechanic UX Principle: "works with poor internet").
 *
 * The mechanic's actions must confirm instantly and never be lost when the
 * signal drops. So every mutation is recorded here first — in memory and in
 * localStorage — with a stable client-generated idempotency key, then flushed
 * to the backend's /sync/mutations endpoint when connectivity allows. Because
 * that endpoint is idempotent by construction (Phase 2 review), replaying the
 * same mutation after a flaky send can never double-apply it: a part is not
 * added twice, a clock entry is not duplicated.
 *
 * The queue is intentionally simple and durable rather than clever. It is the
 * client mirror of the server's sync contract, nothing more.
 */

export type MutationType =
  | 'work_order.add_line'
  | 'work_order.transition'
  | 'time.clock_on'
  | 'time.clock_off';

export interface QueuedMutation {
  type: MutationType;
  deviceId: string;
  idempotencyKey: string;
  payload: any;
  /** Local bookkeeping: when queued, and how many flush attempts so far. */
  queuedAt: number;
  attempts: number;
  status: 'pending' | 'synced' | 'error';
}

const STORE_KEY = 'wos.mutationQueue';

function deviceId(): string {
  if (typeof window === 'undefined') return 'server';
  let id = window.localStorage.getItem('wos.deviceId');
  if (!id) {
    id = `dev_${crypto.randomUUID()}`;
    window.localStorage.setItem('wos.deviceId', id);
  }
  return id;
}

function load(): QueuedMutation[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(window.localStorage.getItem(STORE_KEY) ?? '[]') as QueuedMutation[];
  } catch {
    return [];
  }
}

function save(q: QueuedMutation[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORE_KEY, JSON.stringify(q));
}

const listeners = new Set<() => void>();
function notify() { listeners.forEach((l) => l()); }

export function subscribeQueue(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Number of mutations still waiting to sync — drives the header indicator. */
export function pendingCount(): number {
  return load().filter((m) => m.status !== 'synced').length;
}

/**
 * Enqueue a mutation and attempt an immediate flush. Returns right away so the
 * UI can update optimistically; the flush happens in the background.
 */
export function enqueue(type: MutationType, payload: any): QueuedMutation {
  const m: QueuedMutation = {
    type,
    deviceId: deviceId(),
    idempotencyKey: `${type}:${crypto.randomUUID()}`,
    payload,
    queuedAt: Date.now(),
    attempts: 0,
    status: 'pending',
  };
  const q = load();
  q.push(m);
  save(q);
  notify();
  void flush();
  return m;
}

let flushing = false;

/** Drain pending mutations to the backend. Safe to call repeatedly. */
export async function flush(): Promise<void> {
  if (flushing) return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  if (!getSession()) return;

  flushing = true;
  try {
    const q = load();
    const pending = q.filter((m) => m.status !== 'synced');
    if (pending.length === 0) return;

    // The server replays in order and returns a result per idempotency key.
    const results = await api.sync.replay(
      pending.map((m) => ({
        type: m.type, deviceId: m.deviceId, idempotencyKey: m.idempotencyKey, payload: m.payload,
      })),
    );
    const ok = new Set(results.map((r) => r.idempotencyKey));
    for (const m of q) {
      if (ok.has(m.idempotencyKey)) m.status = 'synced';
    }
    // Keep a short tail of synced items for traceability, drop the rest.
    const trimmed = q.filter((m) => m.status !== 'synced').concat(
      q.filter((m) => m.status === 'synced').slice(-20),
    );
    save(trimmed);
    notify();
  } catch {
    // Leave items pending; a later flush (on reconnect) will retry. The screen
    // already reflected the action optimistically, so the mechanic is unblocked.
    const q = load();
    for (const m of q) if (m.status === 'pending') m.attempts += 1;
    save(q);
    notify();
  } finally {
    flushing = false;
  }
}

/** Wire automatic flushing on reconnect; call once from a top-level effect. */
export function startAutoFlush(): () => void {
  if (typeof window === 'undefined') return () => {};
  const onOnline = () => void flush();
  window.addEventListener('online', onOnline);
  const id = setInterval(() => void flush(), 15000);
  return () => {
    window.removeEventListener('online', onOnline);
    clearInterval(id);
  };
}
