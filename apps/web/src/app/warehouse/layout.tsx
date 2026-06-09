'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getSession } from '@/lib/session';
import { loadSettings } from '@/lib/workshop-settings';

/*
 * Warehouse shell — redesigned to the A-SPRINT spec, matching the advisor shell:
 * dark navy rail (brand mark + subtitle, solid-fill active pill, a "connected"
 * status card and the workshop account), a light top bar with a section
 * breadcrumb + signed-in user, a light content area, and a shared footer.
 */
export default function WarehouseLayout({ children }: { children: React.ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);
  const navPath = usePathname();
  useEffect(() => { setNavOpen(false); }, [navPath]);
  return (
    <div className="grid min-h-screen grid-cols-1 bg-floor lg:grid-cols-[15.5rem_1fr]">
      <Rail open={navOpen} onClose={() => setNavOpen(false)} />
      {navOpen && <div onClick={() => setNavOpen(false)} aria-hidden className="fixed inset-0 z-40 bg-black/50 lg:hidden" />}
      <div className="flex min-w-0 flex-col">
        <TopBar onMenu={() => setNavOpen(true)} />
        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
        <footer className="px-6 pb-6 pt-2 text-center text-xs text-muted2">
          A-SPRINT OS · Vse pravice pridržane © {new Date().getFullYear()}
        </footer>
      </div>
    </div>
  );
}

type Icon = (p: { className?: string }) => JSX.Element;
const I: Record<string, Icon> = {
  overview: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 8 12 3 3 8l9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/></svg>),
  receive: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12m0 0 4-4m-4 4-4-4"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>),
  ai: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/><rect x="7" y="7" width="10" height="10" rx="2"/><path d="M10 11h4M10 14h4"/></svg>),
  items: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>),
  moves: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/></svg>),
  count: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h11"/></svg>),
  suppliers: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9h13v8H3z"/><path d="M16 13h4l1 4h-5z"/><circle cx="7" cy="18" r="1.5"/><circle cx="18" cy="18" r="1.5"/></svg>),
  settings: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15H4.5a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 6 9.6l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 11 4.6V4.5a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 18 6l.06-.06a2 2 0 1 1 2.83 2.83L20.4 8.8A1.65 1.65 0 0 0 19.4 11h.1a2 2 0 1 1 0 4h-.1z"/></svg>),
};

type NavItem = { href: string; label: string; icon: string };
const NAV: NavItem[] = [
  { href: '/warehouse', label: 'Pregled', icon: 'overview' },
  { href: '/warehouse/receiving', label: 'Prejem blaga', icon: 'receive' },
  { href: '/warehouse/ai-import', label: 'AI uvoz', icon: 'ai' },
  { href: '/warehouse/items', label: 'Postavke', icon: 'items' },
  { href: '/warehouse/presets', label: 'Paketi', icon: 'items' },
  { href: '/warehouse/movements', label: 'Premiki', icon: 'moves' },
  { href: '/warehouse/stocktake', label: 'Inventura', icon: 'count' },
  { href: '/warehouse/suppliers', label: 'Dobavitelji', icon: 'suppliers' },
  { href: '/warehouse/settings', label: 'Nastavitve', icon: 'settings' },
];

function activeItem(path: string): NavItem | undefined {
  return NAV.find((n) => (n.href === '/warehouse' ? path === n.href : path.startsWith(n.href)));
}

function Rail({ open, onClose }: { open: boolean; onClose: () => void }) {
  const path = usePathname() ?? '/warehouse';
  const [company, setCompany] = useState('');
  useEffect(() => {
    let alive = true;
    loadSettings().then((s) => { if (alive) setCompany(s.company?.name ?? ''); }).catch(() => { /* ignore */ });
    return () => { alive = false; };
  }, []);

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
        const active = n.href === '/warehouse' ? path === n.href : path.startsWith(n.href);
        return (
          <Link key={n.href} href={n.href} onClick={onClose}
            className={`flex items-center gap-3 rounded-tool px-3 py-2.5 font-semibold transition
              ${active ? 'bg-brand text-white shadow-tool' : 'text-sidebartext hover:bg-white/5 hover:text-white'}`}>
            <Ic className="h-[18px] w-[18px] flex-none" />
            <span className="flex-1">{n.label}</span>
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

      <Link href="/warehouse/settings" className="mt-2 flex items-center gap-2.5 rounded-tool px-2 py-2 transition hover:bg-white/5">
        <span className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-white/10 text-white">
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 13h.01M9 17h.01M15 9h.01M15 13h.01M15 17h.01"/></svg>
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-sm font-bold text-white">{company || 'A-SPRINT Demo'}</span>
          <span className="block text-xs text-sidebartext">Skladišče</span>
        </span>
        <svg viewBox="0 0 24 24" className="h-4 w-4 flex-none text-sidebartext" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
      </Link>
    </aside>
  );
}

function TopBar({ onMenu }: { onMenu: () => void }) {
  const path = usePathname() ?? '/warehouse';
  const section = activeItem(path)?.label ?? 'Skladišče';
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const session = mounted ? getSession() : null;
  const name = session?.user.name ?? 'Skladiščnik';
  const initial = name.trim().charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-surface px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:gap-4 sm:px-6">
      <button onClick={onMenu} aria-label="Meni" className="grid h-10 w-10 flex-none place-items-center rounded-tool text-muted transition hover:bg-floor hover:text-ink lg:hidden">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
      </button>
      <nav className="flex items-center gap-2 text-sm">
        <span className="font-semibold text-muted2">Skladišče</span>
        <span className="text-linestrong">›</span>
        <span className="font-bold text-ink">{section}</span>
      </nav>
      <div className="ml-auto flex items-center gap-3">
        <button className="flex items-center gap-2.5 rounded-full border border-line py-1 pl-1 pr-2.5 transition hover:bg-floor">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-brandweak text-sm font-bold text-brand">{initial}</span>
          <span className="hidden leading-tight sm:block">
            <span className="block text-left text-sm font-bold text-ink">{name}</span>
            <span className="block text-left text-xs text-muted2">Skladišče</span>
          </span>
          <svg viewBox="0 0 24 24" className="h-4 w-4 flex-none text-muted2" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
        </button>
      </div>
    </header>
  );
}
