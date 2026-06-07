/**
 * Attachment policy — the rules that decide whether a proposed upload is
 * acceptable, independent of any storage backend. This is the security and
 * correctness heart of the upload feature, so it lives in the dependency-free
 * core and is exercised by tests: an allowlist of content types per attachment
 * kind, a maximum byte size per kind, and a canonical file extension. Anything
 * the policy does not explicitly permit is rejected.
 */

export type AttachmentKind = "photo" | "voice_note" | "document";

export const ATTACHMENT_KINDS: readonly AttachmentKind[] = ["photo", "voice_note", "document"];

interface KindPolicy {
  /** Allowed MIME types (exact match, lowercased). */
  contentTypes: Record<string, string>; // contentType -> canonical extension
  /** Maximum size in bytes. */
  maxBytes: number;
}

const MB = 1024 * 1024;

/**
 * Per-kind policy. Photos and voice notes are what the mechanic captures on the
 * shop floor; documents cover everything an advisor might attach (a delivery
 * note, a customer's emailed PO). Limits are deliberately generous enough for a
 * phone photo or a short voice memo but bounded to protect storage and the
 * mechanic's mobile data.
 */
export const ATTACHMENT_POLICY: Record<AttachmentKind, KindPolicy> = {
  photo: {
    contentTypes: {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/heic": "heic",
    },
    maxBytes: 25 * MB,
  },
  voice_note: {
    contentTypes: {
      "audio/webm": "webm",
      "audio/ogg": "ogg",
      "audio/m4a": "m4a",
      "audio/mp4": "m4a",
      "audio/mpeg": "mp3",
    },
    maxBytes: 15 * MB,
  },
  document: {
    contentTypes: {
      "application/pdf": "pdf",
      "image/jpeg": "jpg",
      "image/png": "png",
    },
    maxBytes: 20 * MB,
  },
};

export interface AttachmentValidationResult {
  ok: boolean;
  reason?: string;
  /** Canonical extension to use in the storage key when ok. */
  extension?: string;
}

/** Validate a proposed upload against the policy for its kind. */
export function validateAttachment(input: {
  kind: string;
  contentType: string;
  byteSize: number;
}): AttachmentValidationResult {
  if (!ATTACHMENT_KINDS.includes(input.kind as AttachmentKind)) {
    return { ok: false, reason: `unsupported attachment kind: ${input.kind}` };
  }
  const policy = ATTACHMENT_POLICY[input.kind as AttachmentKind];
  const contentType = input.contentType.toLowerCase().split(";")[0].trim();
  const extension = policy.contentTypes[contentType];
  if (!extension) {
    return { ok: false, reason: `content type not allowed for ${input.kind}: ${contentType}` };
  }
  if (!Number.isInteger(input.byteSize) || input.byteSize <= 0) {
    return { ok: false, reason: "byteSize must be a positive integer" };
  }
  if (input.byteSize > policy.maxBytes) {
    return {
      ok: false,
      reason: `file too large for ${input.kind}: ${input.byteSize} > ${policy.maxBytes}`,
    };
  }
  return { ok: true, extension };
}
