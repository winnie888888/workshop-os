import { test, assert, assertThrows } from './harness.ts';
import { assertSupplierInvariants, SupplierError } from '../src/domain/supplier.ts';

const good = {
  name: 'Hella Slovenija d.o.o.', country: 'SI', currency: 'EUR',
  vatId: 'SI12345678', paymentTermsDays: 30, defaultLeadTimeDays: 3,
};

test('supplier: a well-formed supplier passes', () => {
  assertSupplierInvariants(good);
});

test('supplier: name is required', () => {
  assertThrows(() => assertSupplierInvariants({ ...good, name: '  ' }), SupplierError);
});

test('supplier: country must be 2 letters', () => {
  assertThrows(() => assertSupplierInvariants({ ...good, country: 'SVN' }), SupplierError);
});

test('supplier: currency must be 3 letters', () => {
  assertThrows(() => assertSupplierInvariants({ ...good, currency: 'EU' }), SupplierError);
});

test('supplier: negative payment terms rejected', () => {
  assertThrows(() => assertSupplierInvariants({ ...good, paymentTermsDays: -1 }), SupplierError);
});

test('supplier: negative lead time rejected', () => {
  assertThrows(() => assertSupplierInvariants({ ...good, defaultLeadTimeDays: -2 }), SupplierError);
});

test('supplier: malformed VAT id rejected when present', () => {
  assertThrows(() => assertSupplierInvariants({ ...good, vatId: '!!' }), SupplierError);
});

test('supplier: null VAT id is allowed (not all suppliers are EU VAT-registered)', () => {
  assertSupplierInvariants({ ...good, vatId: null });
});
