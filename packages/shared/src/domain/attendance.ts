/**
 * Attendance time & Slovenian labour rules (Phase 9).
 *
 * IMPORTANT separation (required by BOTH specs): this module is about ATTENDANCE
 * — was the person present at work, for how long, net of breaks — which is a
 * DIFFERENT ledger from work-order time tracking (how long a specific job took).
 * The same wall-clock hour can appear in both; that is not double counting, it is
 * two different questions. This module never touches work-order time; the only
 * place the two meet is the consistency check, which RECONCILES them and flags
 * differences for a human, never alters either.
 *
 * Everything here is pure, deterministic, dependency-free, and tested by
 * execution. Times are handled as epoch SECONDS (UTC) so the arithmetic is
 * timezone-agnostic; the presentation layer localises to Europe/Ljubljana.
 *
 * Slovenian legal thresholds are encoded as named constants with the source
 * noted, so an accountant can verify each against the Employment Relationships
 * Act (Zakon o delovnih razmerjih, ZDR-1) and the Working Time records act
 * (ZEPDSV). They are conservative evidence thresholds, NOT legal advice; the
 * module FLAGS conditions for human review and never blocks or auto-adjusts.
 */

// ---------------------------------------------------------------------------
// Slovenian labour-law thresholds (ZDR-1 / ZEPDSV). Values are the statutory
// minimums most relevant to working-time EVIDENCE; a workshop's collective
// agreement may be more generous, which the module tolerates (it only flags
// breaches of the statutory floor, never enforces a ceiling).
// ---------------------------------------------------------------------------

export const SI_LABOUR = {
  /** Full-time week is 40h; many CLAs use 40, ZDR-1 caps full-time at 40h. */
  fullWeekHours: 40,
  /** ZDR-1 Art. 154: a worker working >6h/day is entitled to a 30-min break. */
  breakEntitlementThresholdHours: 6,
  minBreakMinutes: 30,
  /** ZDR-1 Art. 155: daily rest of at least 12 consecutive hours between days. */
  minDailyRestHours: 12,
  /** ZDR-1 Art. 143: overtime max 8h/week, 20h/month, 170h/year (guidance). */
  maxOvertimePerWeekHours: 8,
  /** A standard full working day used to derive overtime above daily norm. */
  standardDayHours: 8,
  /** Beyond this many hours present in one day, flag for review (ZDR-1 limits). */
  longDayFlagHours: 10,
} as const;

// ---------------------------------------------------------------------------
// Core types. An attendance DAY is built from a clock-in, a clock-out, and any
// number of breaks. We keep raw seconds and derive everything, so corrections
// are transparent and auditable.
// ---------------------------------------------------------------------------

/** A break within a working day, in epoch seconds. */
export interface BreakInterval {
  startSec: number;
  endSec: number | null; // null = break still open
}

/** The raw inputs for one attendance day. */
export interface AttendanceDayInput {
  clockInSec: number;
  clockOutSec: number | null;  // null = still clocked in
  breaks: BreakInterval[];
}

/** The computed shape of an attendance day. */
export interface AttendanceDay {
  /** Gross seconds present = clockOut - clockIn (0 if still open / invalid). */
  grossSeconds: number;
  /** Total break seconds (closed breaks only). */
  breakSeconds: number;
  /** Net worked seconds = gross - breaks (never negative). */
  netWorkedSeconds: number;
  /** True while the day has no clock-out yet. */
  open: boolean;
  /** Conditions worth a human's attention (see AttendanceFlag). */
  flags: AttendanceFlag[];
}

export const AttendanceFlag = {
  MissingClockOut: 'missing_clock_out',
  NegativeDuration: 'negative_duration',
  BreakTooShort: 'break_too_short',         // >6h day but <30min break recorded
  OverlappingBreak: 'overlapping_break',
  LongDay: 'long_day',                      // present > longDayFlagHours
  BreakOutsideShift: 'break_outside_shift',
} as const;
export type AttendanceFlag = (typeof AttendanceFlag)[keyof typeof AttendanceFlag];

const HOUR = 3600;

/**
 * Compute an attendance day from its raw events, including the labour-law flags.
 * Pure: given the same inputs it always returns the same result, which is what
 * makes a timesheet reproducible and a correction auditable.
 */
export function computeAttendanceDay(input: AttendanceDayInput): AttendanceDay {
  const flags: AttendanceFlag[] = [];
  const open = input.clockOutSec == null;

  // Gross presence. If still open, gross is 0 (we do not guess a clock-out).
  let grossSeconds = 0;
  if (!open) {
    grossSeconds = (input.clockOutSec as number) - input.clockInSec;
    if (grossSeconds < 0) { flags.push(AttendanceFlag.NegativeDuration); grossSeconds = 0; }
  } else {
    flags.push(AttendanceFlag.MissingClockOut);
  }

  // Breaks. Sum closed breaks; validate each lies within the shift and that
  // breaks do not overlap one another.
  const closed = input.breaks.filter((b) => b.endSec != null) as Array<{ startSec: number; endSec: number }>;
  let breakSeconds = 0;
  const sorted = [...closed].sort((a, b) => a.startSec - b.startSec);
  let prevEnd = -Infinity;
  for (const b of sorted) {
    const dur = b.endSec - b.startSec;
    if (dur < 0) { flags.push(AttendanceFlag.NegativeDuration); continue; }
    breakSeconds += dur;
    if (b.startSec < prevEnd) flags.push(AttendanceFlag.OverlappingBreak);
    prevEnd = Math.max(prevEnd, b.endSec);
    if (!open) {
      const outSec = input.clockOutSec as number;
      if (b.startSec < input.clockInSec || b.endSec > outSec) {
        flags.push(AttendanceFlag.BreakOutsideShift);
      }
    }
  }

  const netWorkedSeconds = Math.max(0, grossSeconds - breakSeconds);

  // Labour-law evidence flags (only when the day is closed and positive).
  if (!open && grossSeconds > 0) {
    const grossHours = grossSeconds / HOUR;
    if (grossHours > SI_LABOUR.breakEntitlementThresholdHours
        && breakSeconds < SI_LABOUR.minBreakMinutes * 60) {
      // Worked >6h but less than the 30-min entitled break was recorded.
      flags.push(AttendanceFlag.BreakTooShort);
    }
    if (grossHours > SI_LABOUR.longDayFlagHours) flags.push(AttendanceFlag.LongDay);
  }

  return { grossSeconds, breakSeconds, netWorkedSeconds, open, flags: dedupe(flags) };
}

/**
 * Split a day's net worked hours into regular and overtime against the standard
 * day (8h). This is a DAILY view; the monthly roll-up below also reports weekly
 * overtime, which is the figure Slovenian payroll usually cares about.
 */
export function splitRegularOvertime(netWorkedSeconds: number): { regularSeconds: number; overtimeSeconds: number } {
  const std = SI_LABOUR.standardDayHours * HOUR;
  if (netWorkedSeconds <= std) return { regularSeconds: netWorkedSeconds, overtimeSeconds: 0 };
  return { regularSeconds: std, overtimeSeconds: netWorkedSeconds - std };
}

// ---------------------------------------------------------------------------
// Daily rest check (ZDR-1 Art. 155): between the clock-out of one day and the
// clock-in of the next, a worker needs >=12h of rest. We expose it as a pure
// check the service can run across consecutive days.
// ---------------------------------------------------------------------------

export function dailyRestSufficient(prevClockOutSec: number, nextClockInSec: number): boolean {
  return (nextClockInSec - prevClockOutSec) >= SI_LABOUR.minDailyRestHours * HOUR;
}

// ---------------------------------------------------------------------------
// Leave. The spec's leave types; hours are derived from a configurable working
// day so a "vacation day" contributes the right number of hours to the month.
// ---------------------------------------------------------------------------

export const LeaveType = {
  Vacation: 'vacation',
  SickLeave: 'sick_leave',
  PersonalLeave: 'personal_leave',
  BusinessLeave: 'business_leave',
  PublicHoliday: 'public_holiday',
  PlannedAbsence: 'planned_absence',
} as const;
export type LeaveType = (typeof LeaveType)[keyof typeof LeaveType];

/** Leave types that count as PAID presence-equivalent for the monthly total. */
const PAID_LEAVE: ReadonlySet<LeaveType> = new Set([
  LeaveType.Vacation, LeaveType.SickLeave, LeaveType.PersonalLeave,
  LeaveType.BusinessLeave, LeaveType.PublicHoliday,
]);

export function isPaidLeave(type: LeaveType): boolean {
  return PAID_LEAVE.has(type);
}

// ---------------------------------------------------------------------------
// Monthly timesheet roll-up. Aggregates a month of computed attendance days and
// approved leave into the totals a Slovenian monthly timesheet (mesečna
// evidenca delovnega časa) and payroll need.
// ---------------------------------------------------------------------------

export interface TimesheetDayInput {
  /** ISO date 'yyyy-mm-dd'. */
  date: string;
  /** Net worked seconds for the day (0 on a pure-leave day). */
  netWorkedSeconds: number;
  /** Leave on this day, if any (a day is either worked, on leave, or absent). */
  leaveType?: LeaveType | null;
  /** Hours a full leave day contributes (usually the standard 8h, configurable). */
  leaveHours?: number;
}

export interface MonthlyTimesheet {
  workedSeconds: number;
  regularSeconds: number;
  overtimeSeconds: number;
  /** Leave seconds by type. */
  leaveByType: Record<string, number>;
  totalLeaveSeconds: number;
  /** Worked + paid leave, the figure payroll pays against. */
  paidSeconds: number;
  daysWorked: number;
  daysOnLeave: number;
}

export function rollUpMonth(days: TimesheetDayInput[]): MonthlyTimesheet {
  let workedSeconds = 0, regularSeconds = 0, overtimeSeconds = 0;
  const leaveByType: Record<string, number> = {};
  let totalLeaveSeconds = 0, daysWorked = 0, daysOnLeave = 0;

  for (const d of days) {
    if (d.netWorkedSeconds > 0) {
      workedSeconds += d.netWorkedSeconds;
      const split = splitRegularOvertime(d.netWorkedSeconds);
      regularSeconds += split.regularSeconds;
      overtimeSeconds += split.overtimeSeconds;
      daysWorked += 1;
    }
    if (d.leaveType) {
      const sec = Math.round((d.leaveHours ?? SI_LABOUR.standardDayHours) * HOUR);
      leaveByType[d.leaveType] = (leaveByType[d.leaveType] ?? 0) + sec;
      if (isPaidLeave(d.leaveType)) totalLeaveSeconds += sec;
      daysOnLeave += 1;
    }
  }

  const paidSeconds = workedSeconds + totalLeaveSeconds;
  return {
    workedSeconds, regularSeconds, overtimeSeconds, leaveByType,
    totalLeaveSeconds, paidSeconds, daysWorked, daysOnLeave,
  };
}

function dedupe<T>(xs: T[]): T[] { return Array.from(new Set(xs)); }

/** Convenience: seconds -> decimal hours rounded to 2 places (for display/export). */
export function secondsToHours(sec: number): number {
  return Math.round((sec / HOUR) * 100) / 100;
}
