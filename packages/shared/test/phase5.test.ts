import { test, assert, assertEqual, assertThrows } from './harness.ts';
import * as Inventory from '../src/domain/inventory.ts';
import * as Valuation from '../src/domain/valuation.ts';
import { hasPermission, Permission, Role } from '../src/roles.ts';

const { MovementType, applyMovement, available } = Inventory;

// ---- Transfer movements (R1) ------------------------------------------------

test('transfer_out: decreases on_hand, leaves reserved untouched', () => {
  const after = applyMovement({ onHand: 10, reserved: 3 }, MovementType.TransferOut, 4);
  assertEqual(after.onHand, 6);
  assertEqual(after.reserved, 3);
  assertEqual(available(after), 3);
});

test('transfer_out: cannot move more than the FREE (unreserved) stock', () => {
  // 10 on hand, 8 reserved => only 2 free; moving 3 would strand a reservation.
  assertThrows(() => applyMovement({ onHand: 10, reserved: 8 }, MovementType.TransferOut, 3));
});

test('transfer_in: increases on_hand like a receipt', () => {
  const after = applyMovement({ onHand: 2, reserved: 1 }, MovementType.TransferIn, 5);
  assertEqual(after.onHand, 7);
  assertEqual(after.reserved, 1);
});

test('transfer pair conserves total quantity across two locations', () => {
  const src0 = { onHand: 10, reserved: 0 };
  const dst0 = { onHand: 0, reserved: 0 };
  const src1 = applyMovement(src0, MovementType.TransferOut, 4);
  const dst1 = applyMovement(dst0, MovementType.TransferIn, 4);
  assertEqual(src1.onHand + dst1.onHand, src0.onHand + dst0.onHand); // 10 conserved
});

// ---- Moving-average valuation (R2) -----------------------------------------

test('MAC: first stock takes the receipt unit cost', () => {
  const avg = Valuation.movingAverage({ onHandBefore: 0, avgCostMinorBefore: 0n, receivedQty: 5, receiptUnitCostMinor: 1200n });
  assertEqual(avg, 1200n);
});

test('MAC: blends old and new weighted by quantity', () => {
  // 10 @ 100 + 10 @ 200 => 3000/20 = 150
  const avg = Valuation.movingAverage({ onHandBefore: 10, avgCostMinorBefore: 100n, receivedQty: 10, receiptUnitCostMinor: 200n });
  assertEqual(avg, 150n);
});

test('MAC: rounds half-up to the nearest minor unit', () => {
  // 1 @ 100 + 2 @ 101 => 302/3 = 100.67 -> 101
  const avg = Valuation.movingAverage({ onHandBefore: 1, avgCostMinorBefore: 100n, receivedQty: 2, receiptUnitCostMinor: 101n });
  assertEqual(avg, 101n);
});

test('MAC: a free receipt dilutes the average downward', () => {
  // 10 @ 200 + 10 @ 0 => 2000/20 = 100
  const avg = Valuation.movingAverage({ onHandBefore: 10, avgCostMinorBefore: 200n, receivedQty: 10, receiptUnitCostMinor: 0n });
  assertEqual(avg, 100n);
});

test('MAC: rejects nonsense inputs', () => {
  assertThrows(() => Valuation.movingAverage({ onHandBefore: -1, avgCostMinorBefore: 0n, receivedQty: 1, receiptUnitCostMinor: 0n }));
  assertThrows(() => Valuation.movingAverage({ onHandBefore: 0, avgCostMinorBefore: 0n, receivedQty: 0, receiptUnitCostMinor: 0n }));
});

test('stockValueMinor: on_hand × avg cost', () => {
  assertEqual(Valuation.stockValueMinor(7, 1500n), 10500n);
});

// ---- Warehouse permissions (R4) --------------------------------------------

test('Warehouse role can receive, adjust and transfer stock', () => {
  const roles = [Role.Warehouse];
  assert(hasPermission(roles, Permission.StockReceive), 'receive');
  assert(hasPermission(roles, Permission.StockAdjust), 'adjust');
  assert(hasPermission(roles, Permission.StockTransfer), 'transfer');
});

test('Mechanic cannot adjust or transfer stock', () => {
  const roles = [Role.Mechanic];
  assert(!hasPermission(roles, Permission.StockAdjust), 'no adjust');
  assert(!hasPermission(roles, Permission.StockTransfer), 'no transfer');
  assert(!hasPermission(roles, Permission.PurchaseManage), 'no purchasing');
});

test('Owner can manage purchasing', () => {
  assert(hasPermission([Role.Owner], Permission.PurchaseManage), 'owner purchasing');
});
