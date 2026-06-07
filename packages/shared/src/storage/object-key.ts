/**
 * Object-key construction for the file store. Every uploaded object lives under
 * a tenant-namespaced, collision-proof key, and the key must never be
 * influenced by attacker-controlled input in a way that could escape its
 * prefix (path traversal) or collide with another tenant's data. So the key is
 * built from server-trusted parts (tenant id, kind, a fresh object id) plus a
 * sanitised, fixed extension — never the raw client filename.
 *
 * Key shape:
 *   tenants/<tenantId>/<kind>/<yyyy>/<mm>/<objectId>.<ext>
 *
 * The date segments keep prefixes from growing unbounded and make lifecycle
 * rules (e.g. cold storage after N months) easy to express on the bucket.
 */

const SAFE_SEGMENT = /^[A-Za-z0-9._-]+$/;

function assertSafe(segment: string, label: string): void {
  if (!SAFE_SEGMENT.test(segment)) {
    throw new Error(`unsafe ${label} segment for storage key: ${segment}`);
  }
}

export function buildObjectKey(input: {
  tenantId: string;
  kind: string;
  objectId: string;
  extension: string;
  /** Optional date for the yyyy/mm partition; defaults to now (UTC). */
  at?: Date;
}): string {
  assertSafe(input.tenantId, "tenant");
  assertSafe(input.kind, "kind");
  assertSafe(input.objectId, "objectId");
  assertSafe(input.extension, "extension");
  const d = input.at ?? new Date();
  const yyyy = String(d.getUTCFullYear());
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `tenants/${input.tenantId}/${input.kind}/${yyyy}/${mm}/${input.objectId}.${input.extension}`;
}

/**
 * Sanitise a client-supplied filename for *display/metadata only* (never used
 * in the storage key). Strips directory components and control characters and
 * caps the length, so a malicious name cannot break logs, headers, or UIs.
 */
export function sanitizeFilename(name: string, maxLen = 120): string {
  const base = name.split(/[\\/]/).pop() ?? "file";
  const cleaned = base.replace(/[\u0000-\u001f\u007f]/g, "").replace(/["'`<>]/g, "").trim();
  const safe = cleaned.length > 0 ? cleaned : "file";
  return safe.length > maxLen ? safe.slice(0, maxLen) : safe;
}

/** Confirm a key belongs to the given tenant — defence in depth before a read. */
export function keyBelongsToTenant(key: string, tenantId: string): boolean {
  return key.startsWith(`tenants/${tenantId}/`);
}
