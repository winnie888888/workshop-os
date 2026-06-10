'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { getSession } from '@/lib/session';
import { subscribe } from '@/lib/demo-store';
import { loadSettings } from '@/lib/workshop-settings';
import { Spinner } from '@/components/ui';
import BillingBanner from '@/components/billing-banner';

/*
 * The advisor shell, redesigned to the A-SPRINT spec: a dark navy navigation
 * rail (brand mark + subtitle, live count badges, a solid-fill active pill, a
 * "connected" status card and the workshop account), a light top command bar
 * (global search with a ⌘K hint + notifications + signed-in user), a light work
 * area, and a shared footer. Desktop / large-tablet first.
 */
const OPEN_STATUSES = ['open', 'in_progress', 'awaiting_approval', 'awaiting_parts', 'on_hold', 'ready'];

export default function AdvisorLayout({ children }: { children: React.ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);
  const navPath = usePathname();
  useEffect(() => { setNavOpen(false); }, [navPath]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setNavOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    <div className="grid min-h-screen grid-cols-1 bg-floor lg:grid-cols-[15.5rem_1fr]">
      <Rail open={navOpen} onClose={() => setNavOpen(false)} />
      {navOpen && <div onClick={() => setNavOpen(false)} aria-hidden className="fixed inset-0 z-40 bg-black/50 lg:hidden" />}
      <div className="flex min-w-0 flex-col">
        <CommandBar onMenu={() => setNavOpen((o) => !o)} />
        <main className="min-w-0 flex-1 p-4 sm:p-6"><BillingBanner />{children}</main>
        <footer className="px-6 pb-6 pt-2 text-center text-xs text-muted2">
          A-SPRINT OS · Vse pravice pridržane © {new Date().getFullYear()}
        </footer>
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

type NavItem = { href: string; label: string; icon: string };
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

function Rail({ open, onClose }: { open: boolean; onClose: () => void }) {
  const path = usePathname() ?? '/advisor';
  // Shares the SWR key with the dashboard (same key + fetcher → one request).
  const { data: openWos } = useSWR('advisor-open', () => api.workOrders.list({ statuses: OPEN_STATUSES, limit: 200 }));
  const [company, setCompany] = useState('');
  useEffect(() => {
    let alive = true;
    loadSettings().then((s) => { if (alive) setCompany(s.company?.name ?? ''); }).catch(() => { /* ignore */ });
    return () => { alive = false; };
  }, []);

  const woCount = openWos?.length ?? 0;
  const invCount = openWos?.filter((w) => w.status === 'ready').length ?? 0;
  const badges: Record<string, number> = { '/advisor/work-orders': woCount, '/advisor/invoices': invCount };

  return (
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-[15.5rem] flex-col gap-0.5 overflow-y-auto bg-sidebar px-3 pb-3 text-sidebartext transition-transform duration-300 lg:static lg:z-auto lg:w-auto lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex items-center gap-2.5 px-2 pb-5 pt-4">
        <img src="/asprint-mark.png" alt="A-SPRINT" className="h-9 w-9 flex-none object-contain" />
        <div className="leading-tight">
          <div className="text-lg font-extrabold tracking-tight text-white">A-SPRINT</div>
          <div className="text-[0.7rem] font-medium text-sidebartext">Operativni OS</div>
        </div>
      </div>

      {NAV.map((n) => {
        const Ic = I[n.icon];
        const active = n.href === '/advisor' ? path === n.href : path.startsWith(n.href);
        const badge = badges[n.href];
        return (
          <Link key={n.href} href={n.href} onClick={onClose}
            className={`flex items-center gap-3 rounded-tool px-3 py-2.5 font-semibold transition
              ${active ? 'bg-brand text-white shadow-tool' : 'text-sidebartext hover:bg-white/5 hover:text-white'}`}>
            <Ic className="h-[18px] w-[18px] flex-none" />
            <span className="flex-1">{n.label}</span>
            {badge !== undefined && badge > 0 && (
              <span className={`num grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-xs font-bold
                ${active ? 'bg-white/25 text-white' : 'bg-brand text-white'}`}>{badge}</span>
            )}
          </Link>
        );
      })}

      <Link href="/" className="relative mt-auto overflow-hidden rounded-card bg-sidebar2 px-3 py-3 transition hover:brightness-110">
        <div className="relative z-10 flex items-center gap-2">
          <span className="h-2 w-2 flex-none rounded-full bg-go ring-4 ring-go/20" />
          <span className="text-[0.7rem] font-bold uppercase tracking-wide text-white">Vsi vmesniki</span>
        </div>
        <div className="relative z-10 mt-0.5 pl-4 text-xs text-sidebartext">povezani</div>
        <svg viewBox="0 0 120 60" className="pointer-events-none absolute right-0 top-0 h-full w-28 opacity-20" fill="none" stroke="#9fb0c3" strokeWidth="1">
          <circle cx="92" cy="16" r="3"/><circle cx="110" cy="34" r="3"/><circle cx="78" cy="40" r="3"/><circle cx="100" cy="50" r="2.5"/>
          <path d="M92 16 110 34M92 16 78 40M110 34 100 50M78 40 100 50"/>
        </svg>
      </Link>

      <Link href="/advisor/settings" className="mt-2 flex items-center gap-2.5 rounded-tool px-2 py-2 transition hover:bg-white/5">
        <span className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-white/10 text-white">
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 13h.01M9 17h.01M15 9h.01M15 13h.01M15 17h.01"/></svg>
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-sm font-bold text-white">{company || 'A-SPRINT Demo'}</span>
          <span className="block text-xs text-sidebartext">Delavnica</span>
        </span>
        <svg viewBox="0 0 24 24" className="h-4 w-4 flex-none text-sidebartext" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
      </Link>
    </aside>
  );
}

function CommandBar({ onMenu }: { onMenu: () => void }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const session = mounted ? getSession() : null;
  const name = session?.user.name ?? 'Sprejemnik';
  const initial = name.trim().charAt(0).toUpperCase();

  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Array<{ type: string; id: string; label: string; sublabel?: string }>>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ⌘K / Ctrl+K focuses the global search — a real shortcut, matching the hint.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        document.getElementById('advisor-command')?.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
    else if (hit.type === 'customer') router.push(`/advisor/customers/${hit.id}`);
    else if (hit.type === 'invoice') router.push(`/advisor/invoices/${hit.id}`);
    else if (hit.type === 'vehicle') router.push(`/advisor/vehicles`);
  }

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-surface px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:gap-4 sm:px-6">
      <button onClick={onMenu} aria-label="Meni" className="grid h-10 w-10 flex-none place-items-center rounded-tool text-muted transition hover:bg-floor hover:text-ink lg:hidden">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
      </button>
      <div className="relative max-w-3xl flex-1">
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
          className="min-h-tap w-full rounded-full border border-line bg-surface2 pl-11 pr-16 text-base
            transition focus:border-brandring focus:bg-surface focus:outline-none focus:ring-4 focus:ring-brandweak"
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded-md border border-line bg-surface px-1.5 py-0.5 text-[0.7rem] font-semibold text-muted2 md:flex">⌘ K</kbd>
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
        <NotificationBell />
        <div className="relative">
          <button onClick={() => setMenuOpen((o) => !o)} onBlur={() => setTimeout(() => setMenuOpen(false), 160)}
            aria-haspopup="menu" aria-expanded={menuOpen}
            className="flex items-center gap-2.5 rounded-full border border-line py-1 pl-1 pr-2.5 transition hover:bg-floor">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-brandweak text-sm font-bold text-brand">{initial}</span>
            <span className="hidden leading-tight sm:block">
              <span className="block text-left text-sm font-bold text-ink">{name}</span>
              <span className="block text-left text-xs text-muted2">Sprejemnik</span>
            </span>
            <svg viewBox="0 0 24 24" className={`h-4 w-4 flex-none text-muted2 transition ${menuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
          </button>
          {menuOpen && (
            <div role="menu" className="absolute right-0 top-full z-30 mt-2 w-56 overflow-hidden rounded-card border border-line bg-surface py-1 shadow-lift">
              <div className="border-b border-line px-4 py-2">
                <p className="truncate text-sm font-bold text-ink">{name}</p>
                <p className="text-xs text-muted2">Sprejemnik · A-SPRINT</p>
              </div>
              <Link href="/advisor/settings" role="menuitem" className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-ink hover:bg-floor">
                <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] flex-none text-muted2" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15H4.5a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 6 9.6l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 11 4.6V4.5a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 18 6l.06-.06a2 2 0 1 1 2.83 2.83L20.4 8.8A1.65 1.65 0 0 0 19.4 11h.1a2 2 0 1 1 0 4h-.1z"/></svg>
                Nastavitve
              </Link>
              <Link href="/" role="menuitem" className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-ink hover:bg-floor">
                <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] flex-none text-muted2" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/></svg>
                Zamenjaj vmesnik
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

type Ntf = { id: string; kind: string; title: string; body?: string; entityType?: string; entityId?: string; read: boolean; createdAt: string };

function timeAgo(iso: string): string {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'pravkar';
  const m = Math.floor(s / 60); if (m < 60) return `pred ${m} min`;
  const h = Math.floor(m / 60); if (h < 24) return `pred ${h} h`;
  return `pred ${Math.floor(h / 24)} d`;
}

/**
 * Notification bell. Reads /notifications (real backend, Sprint 3) oz. v demo
 * načinu centralni store — api.notifications je v obeh primerih isti kontrakt.
 * Poll 20 s + refresh ob fokusu; klik označi prebrano in skoči na entiteto.
 */
function NotificationBell() {
  const router = useRouter();
  const [items, setItems] = useState<Ntf[]>([]);
  const [open, setOpen] = useState(false);

  async function load() {
    try { setItems(await api.notifications.list()); } catch { setItems([]); }
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    const unsub = subscribe(load);
    return () => { clearInterval(t); window.removeEventListener('focus', onFocus); unsub(); };
  }, []);


  const unread = items.filter((n) => !n.read).length;

  async function openItem(n: Ntf) {
    setOpen(false);
    try { await api.notifications.markRead(n.id); } catch { /* ignore */ }
    load();
    if (n.entityType === 'work_order' && n.entityId) router.push(`/advisor/work-orders/${n.entityId}`);
    else if (n.entityType === 'invoice' && n.entityId) router.push(`/advisor/invoices/${n.entityId}`);
    else if (n.entityType === 'customer' && n.entityId) router.push(`/advisor/customers/${n.entityId}`);
  }
  async function markAll() { try { await api.notifications.markAllRead(); } catch { /* ignore */ } load(); }

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} onBlur={() => setTimeout(() => setOpen(false), 160)}
        className="relative grid h-10 w-10 place-items-center rounded-full text-muted transition hover:bg-floor hover:text-ink" title="Obvestila">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>
        {unread > 0 && (
          <span className="num absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-brand px-1 text-[0.6rem] font-bold text-white ring-2 ring-surface">{unread}</span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-80 overflow-hidden rounded-card border border-line bg-surface shadow-lift">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <span className="text-sm font-bold text-ink">Obvestila</span>
            {unread > 0 && <button onMouseDown={markAll} className="text-xs font-semibold text-brand hover:underline">Označi vse</button>}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 && <p className="px-4 py-8 text-center text-sm text-muted">Ni obvestil.</p>}
            {items.map((n) => (
              <button key={n.id} onMouseDown={() => openItem(n)}
                className={`flex w-full items-start gap-3 border-b border-line px-4 py-3 text-left last:border-0 hover:bg-floor ${n.read ? '' : 'bg-brandweak/50'}`}>
                <span className={`mt-1.5 h-2 w-2 flex-none rounded-full ${n.read ? 'bg-transparent' : 'bg-brand'}`} />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ink">{n.title}</span>
                  {n.body && <span className="block truncate text-xs text-muted">{n.body}</span>}
                  <span className="block text-[0.7rem] text-muted2">{timeAgo(n.createdAt)}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
