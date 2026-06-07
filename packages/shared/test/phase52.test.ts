import { test, assert, assertEqual, assertThrows } from './harness.ts';
import {
  assertPoTransition, poLinesEditable, poCanReceive, receivedStatusFor, PurchaseOrderError,
} from '../src/domain/purchase-order.ts';

test('PO: draft can be sent or cancelled', () => {
  assertPoTransition('draft', 'sent');
  assertPoTransition('draft', 'cancelled');
});

test('PO: cannot un-send or edit a received PO', () => {
  assertThrows(() => assertPoTransition('sent', 'draft'), PurchaseOrderError);
  assertThrows(() => assertPoTransition('received', 'sent'), PurchaseOrderError);
});

test('PO: lines editable only while draft', () => {
  assert(poLinesEditable('draft'));
  assert(!poLinesEditable('sent'));
});

test('PO: can receive only when sent or partially received', () => {
  assert(poCanReceive('sent'));
  assert(poCanReceive('partially_received'));
  assert(!poCanReceive('draft'));
  assert(!poCanReceive('cancelled'));
});

test('PO: receivedStatusFor detects full receipt', () => {
  assertEqual(receivedStatusFor([{ qtyOrdered: 5, qtyReceived: 5 }], 'sent'), 'received');
});

test('PO: receivedStatusFor detects partial receipt', () => {
  assertEqual(receivedStatusFor([{ qtyOrdered: 5, qtyReceived: 2 }], 'sent'), 'partially_received');
});

test('PO: nothing received leaves status unchanged', () => {
  assertEqual(receivedStatusFor([{ qtyOrdered: 5, qtyReceived: 0 }], 'sent'), 'sent');
});

test('PO: a cancelled PO is never resurrected by a receipt', () => {
  assertEqual(receivedStatusFor([{ qtyOrdered: 5, qtyReceived: 5 }], 'cancelled'), 'cancelled');
});
