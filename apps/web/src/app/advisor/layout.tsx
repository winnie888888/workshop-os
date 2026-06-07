'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { Spinner } from '@/components/ui';

/*
 * The advisor shell: a persistent left navigation rail, a global command bar
 * pinned across the top (the heart of the speed promise), and a main work area.
 * Desktop/large-tablet first, because the advisor is doing real data entry and
 * decision-making at the service desk. Clean, Minimax-aligned light styling.
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
const I = {
  today: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>),
  customers: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/></svg>),
  vehicles: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 17h14M5 17a2 2 0 0 1-2-2V9l2-4h11l3 4v6a2 2 0 0 1-2 2M5 17v2M19 17v2"/><circle cx="7.5" cy="17" r="1.5"/><circle cx="16.5" cy="17" r="1.5"/></svg>),
  workorders: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h6"/></svg>),
  invoices: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 3h16v18l-3-2-3 2-2-2-2 2-3-2-3 2V3Z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>),
} as Record<string, Icon>;

const NAV = [
  { href: '/advisor', label: 'Danes', icon: 'today' },
  { href: '/advisor/customers', label: 'Stranke', icon: 'customers' },
  { href: '/advisor/vehicles', label: 'Vozila', icon: 'vehicles' },
  { href: '/advisor/work-orders', label: 'Delovni nalogi', icon: 'workorders' },
  { href: '/advisor/invoices', label: 'Računi', icon: 'invoices' },
];

function Rail() {
  const path = usePathname();
  return (
    <aside className="flex flex-col gap-0.5 border-r border-line bg-surface p-3">
      <div className="flex items-center gap-2.5 px-2 pb-5 pt-2">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand to-brand700 text-sm font-extrabold text-white shadow-tool">A</div>
        <div className="leading-tight">
          <div className="text-base font-extrabold tracking-tight text-ink">A-SPRINT <span className="text-brand">OS</span></div>
          <div className="-mt-0.5 text-[0.6rem] font-bold uppercase tracking-[0.16em] text-muted2">Servisni pult</div>
        </div>
      </div>
      {NAV.map((n) => {
        const active = n.href === '/advisor' ? path === n.href : path.startsWith(n.href);
        const Ic = I[n.icon];
        return (
          <Link key={n.href} href={n.href}
            className={`relative flex items-center gap-3 rounded-tool px-3 py-2.5 font-semibold transition
              ${active ? 'bg-brandweak text-brand' : 'text-steel hover:bg-surface2 hover:text-ink'}`}>
            {active && <span className="absolute -left-3 bottom-2 top-2 w-[3px] rounded-r bg-brand" />}
            <Ic className="h-[18px] w-[18px]" />{n.label}
          </Link>
        );
      })}
      <Link href="/" className="mt-auto px-3 py-2 text-xs font-semibold text-muted2 hover:text-brand">← vsi vmesniki</Link>
    </aside>
  );
}

function CommandBar() {
  // The single search that resolves the advisor's instinctive first move. It
  // queries the real /search endpoint (debounced) and shows a ranked dropdown
  // spanning customers, vehicles, and work orders; selecting a hit navigates
  // straight to that entity. The classification/ranking is the tested shared
  // core, so a plate query surfaces the vehicle first.
  const router = useRouter();
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
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-surface px-6 py-3">
      <div className="relative flex-1">
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
          placeholder="Išči: tablica, VIN, stranka, št. naloga…"
          className="min-h-tap w-full rounded-tool border border-line bg-surface2 pl-11 pr-4 text-base
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
      <Link href="/advisor/voice"
        className="tool-tap inline-flex min-h-tap items-center gap-2 rounded-tool border border-linestrong bg-surface px-4 font-semibold text-steel transition hover:border-brandring hover:text-brand">
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v4"/></svg>
        Glas
      </Link>
      <Link href="/advisor/plate-scan"
        className="tool-tap inline-flex min-h-tap items-center gap-2 rounded-tool border border-linestrong bg-surface px-4 font-semibold text-steel transition hover:border-brandring hover:text-brand">
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><rect x="7" y="8" width="10" height="8" rx="1"/></svg>
        Skeniraj tablico
      </Link>
      <Link href="/advisor/work-orders/new"
        className="tool-tap inline-flex min-h-tap items-center gap-2 rounded-tool bg-brand px-5 font-semibold text-white shadow-tool transition hover:bg-brand600">
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M12 5v14M5 12h14"/></svg>
        Nov nalog
      </Link>
    </header>
  );
}
