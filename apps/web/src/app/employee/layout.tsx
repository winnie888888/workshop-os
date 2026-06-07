'use client';

/*
 * The employee shell. Attendance is something EVERY employee does regardless of
 * role, so it gets its own clean, narrow, mobile-first home rather than living
 * inside the mechanic console. A single header, a narrow frame, generous tap
 * targets — the spec's requirement that clocking take "seconds from a mobile
 * device" drives the whole layout.
 */
export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-screen max-w-md bg-floor">
      <header className="flex items-center justify-between border-b-2 border-line bg-panel px-4 py-3">
        <span className="font-display text-lg font-extrabold tracking-tight">My Work Time</span>
        <span className="text-xs font-semibold text-steel">A-SPRINT</span>
      </header>
      <div className="px-4 pb-28 pt-4">{children}</div>
    </div>
  );
}
