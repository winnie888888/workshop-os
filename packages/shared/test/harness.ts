/* Minimal dependency-free test harness (no external test runner needed). */

type TestFn = () => void | Promise<void>;
interface Case { name: string; fn: TestFn; }
const cases: Case[] = [];

export function test(name: string, fn: TestFn): void {
  cases.push({ name, fn });
}

export function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error("Assertion failed: " + msg);
}

const bigintReplacer = (_k: string, v: unknown) => (typeof v === "bigint" ? v.toString() + "n" : v);

export function assertEqual<T>(actual: T, expected: T, msg = ""): void {
  const a = typeof actual === "bigint" ? actual.toString() + "n" : JSON.stringify(actual, bigintReplacer);
  const e = typeof expected === "bigint" ? expected.toString() + "n" : JSON.stringify(expected, bigintReplacer);
  if (a !== e) throw new Error(`Expected ${e} but got ${a}. ${msg}`);
}

export function assertThrows(fn: () => unknown, msg = ""): void {
  let threw = false;
  try { fn(); } catch { threw = true; }
  if (!threw) throw new Error("Expected function to throw. " + msg);
}

export async function run(): Promise<void> {
  let passed = 0;
  const failures: string[] = [];
  for (const c of cases) {
    try {
      await c.fn();
      passed++;
      console.log(`  \u2713 ${c.name}`);
    } catch (err) {
      failures.push(`  \u2717 ${c.name}\n      ${(err as Error).message}`);
      console.log(`  \u2717 ${c.name}`);
    }
  }
  console.log(`\n${passed}/${cases.length} passed.`);
  if (failures.length) {
    console.log("\nFailures:\n" + failures.join("\n"));
    process.exit(1);
  }
}
