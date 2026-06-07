/**
 * Money — value object for all monetary amounts in the platform.
 *
 * Invariant (Architecture Blueprint §4.2 / Master Blueprint §4):
 *   Money is stored and computed as INTEGER MINOR UNITS (e.g. cents) using bigint.
 *   Floating point is forbidden anywhere near money.
 *
 * Decimal quantities and percentages are parsed into scaled integers so that
 * multiplication and percentage application are exact, with a single, explicit
 * rounding step (half-up / "round half away from zero") at the end.
 *
 * This file is dependency-free and is executed by the test runner.
 */

export type CurrencyCode = string; // ISO 4217 alpha, e.g. "EUR"

export interface Money {
  readonly currency: CurrencyCode;
  readonly minor: bigint; // amount in minor units (cents)
}

export function money(currency: CurrencyCode, minor: bigint | number): Money {
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error(`Invalid ISO 4217 currency: ${currency}`);
  }
  const m = typeof minor === "number" ? BigInt(assertSafeInt(minor)) : minor;
  return Object.freeze({ currency, minor: m });
}

export function zero(currency: CurrencyCode): Money {
  return money(currency, 0n);
}

function assertSafeInt(n: number): number {
  if (!Number.isInteger(n)) throw new Error(`minor units must be integer, got ${n}`);
  return n;
}

function sameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new Error(`Currency mismatch: ${a.currency} vs ${b.currency}`);
  }
}

export function add(a: Money, b: Money): Money {
  sameCurrency(a, b);
  return money(a.currency, a.minor + b.minor);
}

export function subtract(a: Money, b: Money): Money {
  sameCurrency(a, b);
  return money(a.currency, a.minor - b.minor);
}

export function negate(a: Money): Money {
  return money(a.currency, -a.minor);
}

export function isZero(a: Money): boolean {
  return a.minor === 0n;
}

export function compare(a: Money, b: Money): -1 | 0 | 1 {
  sameCurrency(a, b);
  return a.minor < b.minor ? -1 : a.minor > b.minor ? 1 : 0;
}

/** Parse a decimal string like "2.5", "1.333", "-0.25" into a scaled integer. */
interface Scaled {
  readonly value: bigint; // signed
  readonly scale: number; // number of decimal places
}

function parseDecimal(input: string): Scaled {
  const s = input.trim();
  if (!/^-?\d+(\.\d+)?$/.test(s)) {
    throw new Error(`Invalid decimal: ${input}`);
  }
  const neg = s.startsWith("-");
  const body = neg ? s.slice(1) : s;
  const [intPart, fracPart = ""] = body.split(".");
  const scale = fracPart.length;
  const digits = (intPart + fracPart).replace(/^0+(?=\d)/, "");
  let value = BigInt(digits === "" ? "0" : digits);
  if (neg) value = -value;
  return { value, scale };
}

/** Divide bigint by 10^scale with round-half-away-from-zero. */
function divRoundHalfAway(numerator: bigint, scale: number): bigint {
  if (scale === 0) return numerator;
  const denom = 10n ** BigInt(scale);
  const sign = numerator < 0n ? -1n : 1n;
  const abs = numerator < 0n ? -numerator : numerator;
  const q = abs / denom;
  const r = abs % denom;
  // round half away from zero: if remainder*2 >= denom, round up
  const rounded = r * 2n >= denom ? q + 1n : q;
  return sign * rounded;
}

/**
 * Multiply a money amount by a decimal quantity (e.g. 2.5 hours of labour).
 * Exact integer math with a single half-away rounding to minor units.
 */
export function multiplyByQuantity(m: Money, quantity: string): Money {
  const q = parseDecimal(quantity);
  const product = m.minor * q.value; // minor * (value scaled by q.scale)
  const result = divRoundHalfAway(product, q.scale);
  return money(m.currency, result);
}

/**
 * Apply a percentage given as a decimal string (e.g. "22" for 22%, "9.5").
 * Used for discounts and VAT. Returns the percentage *portion* of m.
 */
export function percentage(m: Money, pct: string): Money {
  const p = parseDecimal(pct);
  // m.minor * p.value / (100 * 10^p.scale)
  const numerator = m.minor * p.value;
  const result = divRoundHalfAway(numerator, p.scale + 2);
  return money(m.currency, result);
}

/**
 * Allocate an amount across integer weights without losing a single minor unit.
 * The remainder is distributed one minor unit at a time to the first buckets.
 * (e.g. splitting a VAT total across rounding, or split-billing across payers.)
 */
export function allocate(m: Money, weights: number[]): Money[] {
  if (weights.length === 0) throw new Error("allocate requires at least one weight");
  if (weights.some((w) => w < 0)) throw new Error("weights must be non-negative");
  const total = weights.reduce((a, b) => a + b, 0);
  if (total === 0) throw new Error("allocate requires a positive total weight");

  const totalMinor = m.minor;
  const totalBig = BigInt(total);
  let allocated = 0n;
  const parts: bigint[] = weights.map((w) => {
    const share = (totalMinor * BigInt(w)) / totalBig; // floor toward zero
    allocated += share;
    return share;
  });
  let remainder = totalMinor - allocated; // always same sign as totalMinor for non-negative weights
  const step = remainder >= 0n ? 1n : -1n;
  let i = 0;
  while (remainder !== 0n) {
    if (weights[i % weights.length] > 0) {
      parts[i % weights.length] += step;
      remainder -= step;
    }
    i++;
  }
  return parts.map((p) => money(m.currency, p));
}

/** Render for human display. Pure; locale formatting of the integer/fraction split. */
export function format(m: Money, fractionDigits = 2): string {
  const denom = 10n ** BigInt(fractionDigits);
  const sign = m.minor < 0n ? "-" : "";
  const abs = m.minor < 0n ? -m.minor : m.minor;
  const intPart = abs / denom;
  const fracPart = abs % denom;
  const frac = fractionDigits > 0 ? "." + fracPart.toString().padStart(fractionDigits, "0") : "";
  return `${sign}${intPart.toString()}${frac} ${m.currency}`;
}

/** Serialize for transport/storage — minor units as a string to survive JSON. */
export function serialize(m: Money): { currency: string; minor: string } {
  return { currency: m.currency, minor: m.minor.toString() };
}

export function deserialize(s: { currency: string; minor: string }): Money {
  return money(s.currency, BigInt(s.minor));
}
