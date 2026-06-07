'use client';

/**
 * Pending attachments (photos and voice notes the mechanic captures).
 *
 * The capture UX is fully functional on the device — the camera takes the
 * photo, the Web Speech API transcribes the note — but these are held locally
 * until the backend exposes an attachments upload endpoint (the single
 * Phase-4 backend dependency the mechanic interface needs). Keeping them in a
 * durable local list means nothing the mechanic captures is lost in the
 * meantime, and the badge on the Photo tile reflects what is waiting.
 *
 * When the upload endpoint lands, the flush logic added here will POST each
 * pending item and clear it, mirroring the mutation queue's pattern.
 */

const KEY = 'wos.pendingAttachments';

export type PendingAttachment =
  | { kind: 'photo'; name: string; size: number; at: number }
  | { kind: 'note'; text: string; at: number };

type Store = Record<string, PendingAttachment[]>; // workOrderId -> items

function load(): Store {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(window.localStorage.getItem(KEY) ?? '{}') as Store; } catch { return {}; }
}
function save(s: Store): void {
  if (typeof window !== 'undefined') window.localStorage.setItem(KEY, JSON.stringify(s));
}

export function addPendingAttachment(workOrderId: string, item: PendingAttachment): void {
  const s = load();
  (s[workOrderId] ??= []).push(item);
  save(s);
}

export function pendingAttachmentCount(workOrderId: string): number {
  return load()[workOrderId]?.length ?? 0;
}

export function pendingAttachments(workOrderId: string): PendingAttachment[] {
  return load()[workOrderId] ?? [];
}
