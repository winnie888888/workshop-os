'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

/*
 * The advisor shell: a persistent left navigation rail, a global command bar
 * pinned across the top (the heart of the speed promise), and a main work area.
 * Desktop/large-tablet first, because the advisor is doing real data entry and
 * decision-making at the service desk.
 */
export default function AdvisorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen grid-cols-[14rem_1fr] bg-floor">
      <Rail />
      <div className="flex min-w-0 flex-col">
        <CommandBar />
        <main className="min-w-0 flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}

const NAV = [
  { href: '/advisor', label: 'Today', icon: '●' },
  { href: '/advisor/customers', label: 'Customers', icon: '◷' },
  { href: '/advisor/vehicles', label: 'Vehicles', icon: '▦' },
  { href: '/advisor/work-orders', label: 'Work Orders', icon: '▤' },
  { href: '/advisor/invoices', label: 'Invoices & AR', icon: '€' },
];

function Rail() {
  const path = usePathname();
  return (
    <aside className="flex flex-col gap-1 border-r border-line bg-ink p-3 text-white">
      <div className="px-2 pb-4 pt-2">
        <div className="font-display text-2xl font-extrabold tracking-tight">A-SPRINT</div>
        <div className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-white/50">Advisor desk</div>
      </div>
      {NAV.map((n) => {
        const active = n.href === '/advisor' ? path === n.href : path.startsWith(n.href);
        return (
          <Link key={n.href} href={n.href}
            className={`flex items-center gap-3 rounded-tool px-3 py-3 font-semibold transition
              ${active ? 'bg-safety text-ink' : 'text-white/80 hover:bg-white/10'}`}>
            <span className="w-5 text-center">{n.icon}</span>{n.label}
          </Link>
        );
      })}
      <Link href="/" className="mt-auto px-3 py-2 text-xs text-white/40 hover:text-white/70">← all interfaces</Link>
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
    <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-line bg-panel px-6 py-3">
      <div className="relative flex-1">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-steel">{loading ? '⏳' : '🔍'}</span>
        <input
          id="advisor-command"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => hits.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search plate, VIN, customer, WO#…"
          className="min-h-tap w-full rounded-tool border-2 border-line bg-floor pl-11 pr-4 text-tap
            focus:border-info focus:outline-none"
        />
        {open && hits.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-tool border border-line bg-panel shadow-lift">
            {hits.map((h) => (
              <button key={`${h.type}:${h.id}`} onMouseDown={() => go(h)}
                className="flex w-full items-center justify-between gap-3 border-b border-line px-4 py-3 text-left last:border-0 hover:bg-floor">
                <span className="flex items-center gap-3">
                  <span className="rounded bg-steel/10 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-steel">
                    {h.type === 'work_order' ? 'WO' : h.type}
                  </span>
                  <span className="font-mono font-bold">{h.label}</span>
                </span>
                {h.sublabel && <span className="truncate text-sm text-steel">{h.sublabel}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
      <Link href="/advisor/voice"
        className="tool-tap inline-flex items-center gap-2 rounded-tool border-2 border-info px-4 font-display font-bold text-info">
        🎙️ Voice
      </Link>
      <Link href="/advisor/plate-scan"
        className="tool-tap inline-flex items-center gap-2 rounded-tool border-2 border-info px-4 font-display font-bold text-info">
        📷 Scan plate
      </Link>
      <Link href="/advisor/work-orders/new"
        className="tool-tap inline-flex items-center gap-2 rounded-tool bg-info px-5 font-display font-bold text-white">
        + New job
      </Link>
    </header>
  );
}
