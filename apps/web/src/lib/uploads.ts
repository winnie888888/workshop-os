'use client';

import { api } from './api';
import { addPendingAttachment } from './attachments';
import { DEMO_MODE } from './demo';

/**
 * Upload workflow — the client half of the attachments feature. It implements
 * the three-step contract the backend expects:
 *
 *   1. presign  — ask the API for a one-time upload URL (validates policy,
 *                 creates a 'pending' row, audits the intent).
 *   2. PUT       — send the bytes straight to the object store via that URL, so
 *                 large phone photos never stream through the API.
 *   3. complete  — tell the API the bytes landed (and, for a voice note, hand
 *                 over the on-device transcript); the row flips to 'stored'.
 *
 * If the device is offline or any step fails, the capture is preserved in the
 * local pending store (the same durable list the mechanic UI already uses) so
 * nothing is lost; a later flush replays it. This mirrors the offline-first
 * guarantee of the mutation queue, applied to files.
 */

async function sha256Hex(data: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export interface UploadResult {
  ok: boolean;
  attachmentId?: string;
  queuedOffline?: boolean;
  error?: string;
}

/** Upload a captured photo file against a work order. */
export async function uploadPhoto(workOrderId: string, file: File): Promise<UploadResult> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    addPendingAttachment(workOrderId, { kind: 'photo', name: file.name, size: file.size, at: Date.now() });
    return { ok: true, queuedOffline: true };
  }
  try {
    const bytes = await file.arrayBuffer();
    const presigned = await api.attachments.presign({
      workOrderId, kind: 'photo',
      filename: file.name || 'photo.jpg',
      contentType: file.type || 'image/jpeg',
      byteSize: file.size,
    });
    await putBytes(presigned.upload, bytes, file.type || 'image/jpeg');
    const checksum = await sha256Hex(bytes);
    await api.attachments.complete(presigned.attachmentId, { checksumSha256: checksum });
    return { ok: true, attachmentId: presigned.attachmentId };
  } catch (e) {
    // Preserve the capture locally and let a later flush retry.
    addPendingAttachment(workOrderId, { kind: 'photo', name: file.name, size: file.size, at: Date.now() });
    return { ok: false, queuedOffline: true, error: e instanceof Error ? e.message : 'upload failed' };
  }
}

/** Upload a recorded voice note (audio blob) plus its on-device transcript. */
export async function uploadVoiceNote(
  workOrderId: string,
  audio: Blob,
  transcript: string,
): Promise<UploadResult> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    addPendingAttachment(workOrderId, { kind: 'note', text: transcript, at: Date.now() });
    return { ok: true, queuedOffline: true };
  }
  try {
    const bytes = await audio.arrayBuffer();
    const contentType = audio.type || 'audio/webm';
    const presigned = await api.attachments.presign({
      workOrderId, kind: 'voice_note',
      filename: `note-${Date.now()}.webm`,
      contentType,
      byteSize: bytes.byteLength,
    });
    await putBytes(presigned.upload, bytes, contentType);
    const checksum = await sha256Hex(bytes);
    await api.attachments.complete(presigned.attachmentId, { checksumSha256: checksum, transcript });
    return { ok: true, attachmentId: presigned.attachmentId };
  } catch (e) {
    addPendingAttachment(workOrderId, { kind: 'note', text: transcript, at: Date.now() });
    return { ok: false, queuedOffline: true, error: e instanceof Error ? e.message : 'upload failed' };
  }
}

async function putBytes(
  upload: { url: string; method: 'PUT'; headers: Record<string, string> },
  bytes: ArrayBuffer,
  contentType: string,
): Promise<void> {
  const res = await fetch(upload.url, {
    method: upload.method,
    headers: { ...upload.headers, 'content-type': upload.headers['Content-Type'] ?? contentType },
    body: bytes,
  });
  if (!res.ok) throw new Error(`Storage upload failed (${res.status})`);
}

/**
 * Upload a standalone document (a photographed delivery note or supplier
 * invoice) that is NOT tied to a work order. Used by OCR receiving: the same
 * presign → PUT → complete contract, with kind 'document' and no workOrderId.
 * Returns the stored attachment id, which the OCR endpoint then extracts from.
 * Unlike photo capture this is not queued offline — extraction needs the server,
 * so we surface a clear error if the upload cannot complete.
 */
export async function uploadDocument(file: File): Promise<UploadResult> {
  // Demo mode: there is no object store to PUT to, so return a synthetic
  // attachment id immediately. The demo OCR endpoint ignores it and returns a
  // canned extraction, so the clerk still sees the full review flow on a phone.
  if (DEMO_MODE) return { ok: true, attachmentId: 'demo-attachment' };
  try {
    const bytes = await file.arrayBuffer();
    const checksum = await sha256Hex(bytes);
    const presigned = await api.attachments.presign({
      kind: 'document',
      filename: file.name || 'document',
      contentType: file.type || 'application/octet-stream',
      byteSize: file.size,
    });
    await putBytes(presigned.upload, bytes, file.type || 'application/octet-stream');
    await api.attachments.complete(presigned.attachmentId, { checksumSha256: checksum });
    return { ok: true, attachmentId: presigned.attachmentId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'upload failed' };
  }
}
