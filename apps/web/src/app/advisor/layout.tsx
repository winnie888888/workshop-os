'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { getSession } from '@/lib/session';
import { Spinner } from '@/components/ui';

/*
 * The advisor shell, built to the design spec: a dark navy navigation rail with
 * the brand mark, a light top command bar (global search + notifications + the
 * signed-in user), and a light work area. Desktop/large-tablet first.
 */
export default function AdvisorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen grid-cols-[15rem_1fr] bg-floor">
      <Rail />
      <div className="flex min-w-0 flex-col">
        <CommandBar />
        <main className="min-w-0 flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}

type Icon = (p: { className?: string }) => JSX.Element;
const I: Record<string, Icon> = {
  today: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/></svg>),
  customers: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/></svg>),
  vehicles: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 17h14M5 17a2 2 0 0 1-2-2V9l2-4h11l3 4v6a2 2 0 0 1-2 2M5 17v2M19 17v2"/><circle cx="7.5" cy="17" r="1.5"/><circle cx="16.5" cy="17" r="1.5"/></svg>),
  workorders: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h6"/></svg>),
  quotes: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12h6M9 16h6M9 8h2"/><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>),
  invoices: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 3h16v18l-3-2-3 2-2-2-2 2-3-2-3 2V3Z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>),
  calendar: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>),
  messages: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>),
  reports: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18"/><path d="M7 15v3M12 9v9M17 5v13"/></svg>),
  settings: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15H4.5a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 6 9.6l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 11 4.6V4.5a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 18 6l.06-.06a2 2 0 1 1 2.83 2.83L20.4 8.8A1.65 1.65 0 0 0 19.4 11h.1a2 2 0 1 1 0 4h-.1z"/></svg>),
};

type NavItem = { href?: string; label: string; icon: string; soon?: boolean };
const NAV: NavItem[] = [
  { href: '/advisor', label: 'Nadzorna plošča', icon: 'today' },
  { href: '/advisor/customers', label: 'Stranke', icon: 'customers' },
  { href: '/advisor/vehicles', label: 'Vozila', icon: 'vehicles' },
  { href: '/advisor/work-orders', label: 'Delovni nalogi', icon: 'workorders' },
  { href: '/advisor/quotes', label: 'Predračuni', icon: 'quotes' },
  { href: '/advisor/invoices', label: 'Računi', icon: 'invoices' },
  { href: '/advisor/calendar', label: 'Koledar', icon: 'calendar' },
  { href: '/advisor/messages', label: 'Sporočila', icon: 'messages' },
  { href: '/advisor/reports', label: 'Poročila', icon: 'reports' },
  { href: '/advisor/settings', label: 'Nastavitve', icon: 'settings' },
];

function Rail() {
  const path = usePathname() ?? '/advisor';
  return (
    <aside className="flex flex-col gap-0.5 bg-sidebar px-3 pb-3 text-sidebartext">
      <div className="flex items-center gap-2.5 px-2 pb-5 pt-4">
        <img src="/asprint-mark.png" alt="A-SPRINT" className="h-9 w-9 object-contain" />
        <div className="text-lg font-extrabold tracking-tight text-white">A-SPRINT</div>
      </div>
      {NAV.map((n) => {
        const Ic = I[n.icon];
        if (n.soon || !n.href) {
          return (
            <span key={n.label} title="Kmalu"
              className="flex cursor-default items-center gap-3 rounded-tool px-3 py-2.5 font-semibold text-white/30">
              <Ic className="h-[18px] w-[18px]" />{n.label}
            </span>
          );
        }
        const active = n.href === '/advisor' ? path === n.href : path.startsWith(n.href);
        return (
          <Link key={n.href} href={n.href}
            className={`relative flex items-center gap-3 rounded-tool px-3 py-2.5 font-semibold transition
              ${active ? 'bg-sidebar2 text-white' : 'text-sidebartext hover:bg-white/5 hover:text-white'}`}>
            {active && <span className="absolute bottom-2 left-0 top-2 w-[3px] rounded-r bg-brand" />}
            <Ic className="h-[18px] w-[18px]" />{n.label}
          </Link>
        );
      })}
      <Link href="/" className="mt-auto px-3 py-2 text-xs font-semibold text-white/40 hover:text-white">← vsi vmesniki</Link>
    </aside>
  );
}

function CommandBar() {
  const router = useRouter();
  const session = getSession();
  const name = session?.user.name ?? 'Sprejemnik';
  const initial = name.trim().charAt(0).toUpperCase();

  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Array<{ type: string; id: string; label: string; sublabel?: string }>>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) { setHits([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.search(q.trim());
        setHits(res.hits);
        setOpen(true);
      } catch { setHits([]); }
      finally { setLoading(false); }
    }, 220);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [q]);

  function go(hit: { type: string; id: string }) {
    setOpen(false); setQ('');
    if (hit.type === 'work_order') router.push(`/advisor/work-orders/${hit.id}`);
    else if (hit.type === 'customer') router.push(`/advisor/customers`);
    else if (hit.type === 'vehicle') router.push(`/advisor/vehicles`);
  }

  return (
    <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-line bg-surface px-6 py-3">
      <div className="relative max-w-2xl flex-1">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted2">
          {loading
            ? <Spinner className="!h-4 !w-4 text-brand" />
            : <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>}
        </span>
        <input
          id="advisor-command"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => hits.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Išči stranko, vozilo (tablica, VIN) ali nalog…"
          className="min-h-tap w-full rounded-full border border-line bg-surface2 pl-11 pr-4 text-base
            transition focus:border-brandring focus:bg-surface focus:outline-none focus:ring-4 focus:ring-brandweak"
        />
        {open && hits.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-30 mt-1.5 overflow-hidden rounded-card border border-line bg-surface shadow-lift">
            {hits.map((h) => (
              <button key={`${h.type}:${h.id}`} onMouseDown={() => go(h)}
                className="flex w-full items-center justify-between gap-3 border-b border-line px-4 py-3 text-left last:border-0 hover:bg-brandweak">
                <span className="flex items-center gap-3">
                  <span className="rounded-md bg-brandweak px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-brand">
                    {h.type === 'work_order' ? 'DN' : h.type === 'customer' ? 'Stranka' : h.type === 'vehicle' ? 'Vozilo' : h.type}
                  </span>
                  <span className="num font-bold text-ink">{h.label}</span>
                </span>
                {h.sublabel && <span className="truncate text-sm text-muted">{h.sublabel}</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-3">
        <button className="relative grid h-10 w-10 place-items-center rounded-full text-muted transition hover:bg-floor hover:text-ink" title="Obvestila">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>
          <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-stop ring-2 ring-surface" />
        </button>
        <div className="flex items-center gap-2.5 rounded-full border border-line py-1 pl-1 pr-3">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-brandweak text-sm font-bold text-brand">{initial}</span>
          <span className="leading-tight">
            <span className="block text-sm font-bold text-ink">{name}</span>
            <span className="block text-xs text-muted2">Sprejemnik</span>
          </span>
        </div>
      </div>
    </header>
  );
}
