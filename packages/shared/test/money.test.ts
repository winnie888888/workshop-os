import { test, assertEqual, assertThrows } from "./harness.ts";
import * as M from "../src/money.ts";

test("money: add/subtract same currency", () => {
  const a = M.money("EUR", 1050n); // 10.50
  const b = M.money("EUR", 250n); // 2.50
  assertEqual(M.add(a, b).minor, 1300n);
  assertEqual(M.subtract(a, b).minor, 800n);
});

test("money: currency mismatch throws", () => {
  assertThrows(() => M.add(M.money("EUR", 1n), M.money("USD", 1n)));
});

test("money: multiplyByQuantity rounds half away from zero", () => {
  // 12.34 EUR/unit * 2.5 = 30.85
  assertEqual(M.multiplyByQuantity(M.money("EUR", 1234n), "2.5").minor, 3085n);
  // 0.01 * 0.5 = 0.005 -> rounds to 0.01 (1 minor unit)
  assertEqual(M.multiplyByQuantity(M.money("EUR", 1n), "0.5").minor, 1n);
  // labour: 65.00/h * 1.333 h = 86.645 -> 86.65 (8665 minor)
  assertEqual(M.multiplyByQuantity(M.money("EUR", 6500n), "1.333").minor, 8665n);
});

test("money: percentage (VAT 22% of 100.00 = 22.00)", () => {
  assertEqual(M.percentage(M.money("EUR", 10000n), "22").minor, 2200n);
  // 9.5% of 49.99 = 4.74905 -> 4.75
  assertEqual(M.percentage(M.money("EUR", 4999n), "9.5").minor, 475n);
});

test("money: allocate loses no minor unit", () => {
  // split 10.00 across weights 1,1,1 -> 3.34 + 3.33 + 3.33 = 10.00
  const parts = M.allocate(M.money("EUR", 1000n), [1, 1, 1]);
  assertEqual(parts.map((p) => p.minor), [334n, 333n, 333n]);
  const sum = parts.reduce((acc, p) => acc + p.minor, 0n);
  assertEqual(sum, 1000n);
});

test("money: allocate by uneven weights", () => {
  const parts = M.allocate(M.money("EUR", 1000n), [3, 1]);
  assertEqual(parts.map((p) => p.minor), [750n, 250n]);
});

test("money: format and serialize round-trip", () => {
  const m = M.money("EUR", -123456n);
  assertEqual(M.format(m), "-1234.56 EUR");
  const s = M.serialize(m);
  assertEqual(M.deserialize(s).minor, -123456n);
});
