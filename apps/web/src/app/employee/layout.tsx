'use client';

import Link from 'next/link';

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
      <header className="flex items-center justify-between border-b border-line bg-surface px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <span className="flex items-center gap-2">
          <Link href="/" aria-label="Domov" className="-ml-1 grid h-9 w-9 place-items-center rounded-tool text-muted transition hover:bg-floor hover:text-ink">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>
          </Link>
          <img src="/asprint-mark.png" alt="A-SPRINT" className="h-8 w-8 object-contain" />
          <span className="text-lg font-extrabold tracking-tight text-ink">Moj delovni čas</span>
        </span>
        <span className="text-xs font-semibold uppercase tracking-widest text-muted2">A-SPRINT</span>
      </header>
      <div className="px-4 pb-28 pt-4">{children}</div>
    </div>
  );
}
