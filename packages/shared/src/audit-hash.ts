/**
 * Audit hash-chain — tamper-evident audit log (Master Blueprint §8, PRD §4).
 *
 * Each audit entry stores hash = SHA-256(prev_hash || canonical(entry)).
 * Any retroactive edit breaks the chain and is detectable by re-walking it.
 * The DB serialises appends per tenant (the previous hash is read FOR UPDATE),
 * so the chain is linear and gapless per tenant.
 *
 * Uses node:crypto; executed by the test runner (not type-checked by tsc here
 * because @types/node is unavailable offline, but fully runnable).
 */

import { createHash } from "node:crypto";

export interface AuditEntryInput {
  readonly tenantId: string;
  readonly actorId: string | null;
  readonly action: string; // e.g. "customer.created"
  readonly entityType: string; // e.g. "customer"
  readonly entityId: string;
  readonly before: unknown | null;
  readonly after: unknown | null;
  readonly occurredAt: string; // ISO 8601 UTC
}

export interface AuditEntry extends AuditEntryInput {
  readonly seq: number; // per-tenant monotonic sequence
  readonly prevHash: string; // hex; genesis is 64 zeros
  readonly hash: string; // hex
}

export const GENESIS_HASH = "0".repeat(64);

/**
 * Canonical JSON: deterministic key ordering so the hash is stable regardless
 * of object construction order. Recursively sorts object keys.
 */
export function canonicalize(value: unknown): string {
  return JSON.stringify(sortDeep(value));
}

function sortDeep(value: unknown): unknown {
  // Money uses bigint minor units; canonicalization must never crash on it
  // (JSON.stringify rejects bigint). Coerce to a string deterministically.
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) out[key] = sortDeep(obj[key]);
    return out;
  }
  return value;
}

export function computeHash(prevHash: string, input: AuditEntryInput, seq: number): string {
  const canonical = canonicalize({ ...input, seq });
  return createHash("sha256").update(prevHash).update("\n").update(canonical).digest("hex");
}

/** Build the next chained entry given the previous one (or null for genesis). */
export function appendEntry(prev: AuditEntry | null, input: AuditEntryInput): AuditEntry {
  const seq = (prev?.seq ?? 0) + 1;
  const prevHash = prev?.hash ?? GENESIS_HASH;
  const hash = computeHash(prevHash, input, seq);
  return { ...input, seq, prevHash, hash };
}

/** Verify an ordered chain for a tenant. Returns the index of the first break, or -1 if intact. */
export function verifyChain(entries: AuditEntry[]): number {
  let prevHash = GENESIS_HASH;
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (e.seq !== i + 1) return i;
    if (e.prevHash !== prevHash) return i;
    const expected = computeHash(prevHash, stripChainFields(e), e.seq);
    if (expected !== e.hash) return i;
    prevHash = e.hash;
  }
  return -1;
}

function stripChainFields(e: AuditEntry): AuditEntryInput {
  const { seq: _s, prevHash: _p, hash: _h, ...input } = e;
  return input;
}
