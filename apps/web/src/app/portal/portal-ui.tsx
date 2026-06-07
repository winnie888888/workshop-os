'use client';

/*
 * Portal UI kit. The customer portal has a deliberately calmer, simpler look
 * than the staff "shop-floor" interface: lots of white space, big tap targets,
 * a single accent colour, and a bottom tab bar — the conventions a non-technical
 * customer expects from a phone app. These small building blocks keep the
 * screens consistent without pulling in the heavier staff component set.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/*
 * Tiny inline SVG icons so the portal depends on no icon library (the web app's
 * dependencies are intentionally minimal). Each is a 24x24 stroked glyph.
 */
function Icon({ path, active }: { path: string; active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}
const ICONS = {
  home: 'M3 11l9-8 9 8M5 10v10h14V10',
  jobs: 'M14 7l3 3-7 7-3-3zM3 21l3-1 11-11-2-2L4 18z',     // wrench-ish
  invoice: 'M6 2h9l3 3v17l-3-2-3 2-3-2-3 2V2zM9 8h6M9 12h6',
  history: 'M12 7v5l3 2M3 12a9 9 0 1 0 3-6.7L3 8',
  book: 'M7 3v3M17 3v3M4 8h16M4 8v12h16V8M12 12v5M9.5 14.5h5',
};

export function PortalCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-panel p-4 shadow-sm ${className}`}>{children}</div>;
}

export function Money({ minor, currency = 'EUR' }: { minor: string | number; currency?: string }) {
  const n = Number(minor) / 100;
  return <span className="font-mono tabular-nums">{currency} {n.toFixed(2)}</span>;
}

// A coloured pill that reads the customer-facing status label.
export function StatusPill({ status, label }: { status: string; label: string }) {
  const tone =
    status === 'ready' || status === 'paid' || status === 'closed' || status === 'invoiced' ? 'bg-go/15 text-go'
      : status === 'in_progress' || status === 'partly_paid' ? 'bg-info/15 text-info'
      : status === 'overdue' || status === 'declined' || status === 'cancelled' ? 'bg-stop/15 text-stop'
      : 'bg-hold/15 text-hold';
  return <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${tone}`}>{label}</span>;
}

// A simple progress bar for work-order tracking.
export function Progress({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-floor">
      <div className="h-full rounded-full bg-info transition-all" style={{ width: `${Math.max(4, value)}%` }} />
    </div>
  );
}

export function PortalButton({ children, onClick, href, tone = 'primary', disabled }: {
  children: React.ReactNode; onClick?: () => void; href?: string;
  tone?: 'primary' | 'ghost' | 'danger'; disabled?: boolean;
}) {
  const cls = tone === 'primary' ? 'bg-info text-white'
    : tone === 'danger' ? 'bg-stop text-white' : 'bg-floor text-ink border border-line';
  const base = `inline-flex min-h-[48px] items-center justify-center rounded-xl px-5 text-base font-semibold ${cls} ${disabled ? 'opacity-50' : 'active:scale-[0.98]'}`;
  if (href) return <Link href={href} className={base}>{children}</Link>;
  return <button onClick={onClick} disabled={disabled} className={base}>{children}</button>;
}

// Bottom tab bar — the primary navigation on a phone.
export function BottomNav() {
  const path = usePathname();
  const tabs = [
    { href: '/portal', label: 'Home', icon: ICONS.home, match: (p: string) => p === '/portal' },
    { href: '/portal/work-orders', label: 'Jobs', icon: ICONS.jobs, match: (p: string) => p.startsWith('/portal/work-orders') },
    { href: '/portal/invoices', label: 'Invoices', icon: ICONS.invoice, match: (p: string) => p.startsWith('/portal/invoices') },
    { href: '/portal/history', label: 'History', icon: ICONS.history, match: (p: string) => p.startsWith('/portal/history') },
    { href: '/portal/appointments', label: 'Book', icon: ICONS.book, match: (p: string) => p.startsWith('/portal/appointments') },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-line bg-panel pb-[env(safe-area-inset-bottom)]">
      {tabs.map((t) => {
        const active = t.match(path);
        return (
          <Link key={t.href} href={t.href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${active ? 'text-info' : 'text-steel'}`}>
            <Icon path={t.icon} active={active} />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
