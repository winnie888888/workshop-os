/**
 * Rental availability (Phase 12) — the calendar question, made deterministic.
 *
 * "Is this vehicle free for these dates?" reduces to date-range overlap, which is
 * deceptively easy to get wrong at the boundaries (does a booking that ends at
 * noon block one that starts at noon?). So it belongs in the tested shared core
 * rather than scattered through SQL. Pure, dependency-free, tested by execution.
 *
 * Times are epoch milliseconds (Date.parse of an ISO string) so the logic is
 * timezone-agnostic; the backend converts to/from timestamps at the edge.
 */

export interface DateRange {
  /** Inclusive start, epoch ms. */
  startMs: number;
  /** Exclusive end, epoch ms. A return at 12:00 frees the vehicle for a 12:00 pickup. */
  endMs: number;
}

/** An existing booking that may block availability. */
export interface BookingWindow extends DateRange {
  reservationId: string;
  /** Cancelled bookings do not block; the caller may pre-filter, but we also guard. */
  blocks: boolean;
}

/**
 * Do two ranges overlap? We treat ranges as half-open [start, end): touching at a
 * single instant (a.end === b.start) does NOT overlap, which is the behaviour a
 * rental desk expects — a vehicle returned at noon can be re-let at noon.
 */
export function rangesOverlap(a: DateRange, b: DateRange): boolean {
  return a.startMs < b.endMs && b.startMs < a.endMs;
}

/** Validate a requested range: start must be strictly before end. */
export function isValidRange(r: DateRange): boolean {
  return Number.isFinite(r.startMs) && Number.isFinite(r.endMs) && r.startMs < r.endMs;
}

export interface AvailabilityResult {
  available: boolean;
  /** The reservation ids that conflict with the requested range, if any. */
  conflicts: string[];
}

/**
 * Is the vehicle available for `requested`, given its existing bookings? Returns
 * the conflicting reservation ids so the UI can explain WHY it is not free.
 * Cancelled windows (blocks === false) are ignored.
 */
export function checkAvailability(requested: DateRange, existing: BookingWindow[]): AvailabilityResult {
  if (!isValidRange(requested)) return { available: false, conflicts: [] };
  const conflicts: string[] = [];
  for (const b of existing) {
    if (!b.blocks) continue;
    if (rangesOverlap(requested, b)) conflicts.push(b.reservationId);
  }
  return { available: conflicts.length === 0, conflicts };
}

/**
 * The number of rental DAYS for a range, billing convention: any started day
 * counts as a full day (ceil of the elapsed days), with a minimum of one. This
 * matches how rental desks bill — a vehicle out for 25 hours is two days.
 */
export function rentalDays(startMs: number, endMs: number): number {
  if (!(endMs > startMs)) return 1;
  const ms = endMs - startMs;
  const days = Math.ceil(ms / (24 * 3600 * 1000));
  return Math.max(1, days);
}
