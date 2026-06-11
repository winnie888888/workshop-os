/**
 * Testi za per-user permission overrides (Pravice uporabnikov, P1).
 * Zagon (brez namestitev, Node 22 type-stripping):
 *   node --experimental-strip-types packages/shared/test/permission-overrides.test.ts
 */
import assert from 'node:assert/strict';
import {
  Role, Permission,
  hasPermission, permissionsFor,
  effectivePermissionsFor, hasEffectivePermission,
  isValidPermission, type PermissionOverride,
} from '../src/roles.ts';

let n = 0;
function test(name: string, fn: () => void): void {
  fn();
  n++;
  console.log(`  ok ${n}. ${name}`);
}

test('mehanik brez izjem nima invoice:issue', () => {
  assert.equal(hasEffectivePermission([Role.Mechanic], [], Permission.InvoiceIssue), false);
});

test('allow doda pravico mimo vlog', () => {
  const ov: PermissionOverride[] = [{ permission: Permission.InvoiceIssue, allow: true }];
  assert.equal(hasEffectivePermission([Role.Mechanic], ov, Permission.InvoiceIssue), true);
});

test('deny vzame pravico kljub vlogi', () => {
  const ov: PermissionOverride[] = [{ permission: Permission.InvoiceIssue, allow: false }];
  assert.equal(hasEffectivePermission([Role.Advisor], ov, Permission.InvoiceIssue), false);
});

test('deny zmaga, tudi če (pokvarjen vir) obstaja še allow za isto pravico', () => {
  const ov: PermissionOverride[] = [
    { permission: Permission.InvoiceIssue, allow: true },
    { permission: Permission.InvoiceIssue, allow: false },
  ];
  assert.equal(hasEffectivePermission([Role.Advisor], ov, Permission.InvoiceIssue), false);
});

test('izjema za eno pravico ne vpliva na druge', () => {
  const ov: PermissionOverride[] = [{ permission: Permission.InvoiceIssue, allow: false }];
  assert.equal(hasEffectivePermission([Role.Advisor], ov, Permission.WorkOrderCreate), true);
});

test('effectivePermissionsFor: unija + odštevanje', () => {
  const ov: PermissionOverride[] = [
    { permission: Permission.StockReceive, allow: true },   // mehanik dobi prevzem
    { permission: Permission.WorkOrderLineTime, allow: false }, // in izgubi ure
  ];
  const eff = new Set(effectivePermissionsFor([Role.Mechanic], ov));
  assert.equal(eff.has(Permission.StockReceive), true);
  assert.equal(eff.has(Permission.WorkOrderLineTime), false);
});

test('brez izjem se effectivePermissionsFor ujema s permissionsFor', () => {
  const a = [...effectivePermissionsFor([Role.Owner])].sort();
  const b = [...permissionsFor([Role.Owner])].sort();
  assert.deepEqual(a, b);
});

test('readonly vloga z allow dobi natanko eno pravico', () => {
  const ov: PermissionOverride[] = [{ permission: Permission.AnalyticsFinancialView, allow: true }];
  assert.deepEqual(effectivePermissionsFor([Role.ReadOnly], ov), [Permission.AnalyticsFinancialView]);
});

test('isValidPermission loči prave ključe od smeti', () => {
  assert.equal(isValidPermission('invoice:issue'), true);
  assert.equal(isValidPermission('totalno:izmišljeno'), false);
});

test('hasPermission (osnova) ostaja nespremenjen', () => {
  assert.equal(hasPermission([Role.Warehouse], Permission.StockReceive), true);
  assert.equal(hasPermission([Role.Warehouse], Permission.InvoiceIssue), false);
});

console.log(`permission-overrides: ${n}/${n} passed.`);
