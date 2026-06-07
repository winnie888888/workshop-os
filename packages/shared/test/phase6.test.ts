import { test, assert, assertEqual, assertThrows } from './harness.ts';
import {
  createPortalToken, verifyPortalToken, PortalTokenError, newSessionSecret,
} from '../src/auth/portal-token.ts';

const SECRET = 'a-very-long-test-secret-key-1234567890';
const base = { tenantId: 'T1', customerId: 'C1', purpose: 'magic' as const, ttlSeconds: 900 };

test('portal token: round-trips and carries the claims', () => {
  const { token, claims } = createPortalToken(base, SECRET);
  assertEqual(claims.tenantId, 'T1');
  assertEqual(claims.customerId, 'C1');
  const verified = verifyPortalToken(token, SECRET, 'magic');
  assertEqual(verified.customerId, 'C1');
  assertEqual(verified.tenantId, 'T1');
});

test('portal token: a tampered payload fails verification', () => {
  const { token } = createPortalToken(base, SECRET);
  const [payload, sig] = token.split('.');
  // Flip a character in the payload; signature no longer matches.
  const tampered = payload.slice(0, -1) + (payload.slice(-1) === 'A' ? 'B' : 'A') + '.' + sig;
  assertThrows(() => verifyPortalToken(tampered, SECRET, 'magic'), PortalTokenError);
});

test('portal token: a wrong secret fails verification', () => {
  const { token } = createPortalToken(base, SECRET);
  assertThrows(() => verifyPortalToken(token, 'a-different-secret-key-0987654321', 'magic'), PortalTokenError);
});

test('portal token: an expired token is rejected', () => {
  // Issue at t0 with 900s ttl, verify 1000s later.
  const t0 = 1_000_000_000_000;
  const { token } = createPortalToken(base, SECRET, t0);
  assertThrows(() => verifyPortalToken(token, SECRET, 'magic', t0 + 1000 * 1000), PortalTokenError);
});

test('portal token: purpose mismatch is rejected (magic cannot act as session)', () => {
  const { token } = createPortalToken(base, SECRET);
  assertThrows(() => verifyPortalToken(token, SECRET, 'session'), PortalTokenError);
});

test('portal token: refuses a weak secret at creation', () => {
  assertThrows(() => createPortalToken(base, 'short'), PortalTokenError);
});

test('portal token: session secrets are non-empty and unique', () => {
  const a = newSessionSecret(); const b = newSessionSecret();
  assert(a.length > 20 && b.length > 20, 'session secrets should be long');
  assert(a !== b, 'session secrets should be unique');
});
