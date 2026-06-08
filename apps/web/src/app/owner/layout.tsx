'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getSession } from '@/lib/session';
import { loadSettings } from '@/lib/workshop-settings';

/*
 * Owner shell — redesigned to the A-SPRINT spec, matching the advisor & warehouse
 * shells: dark navy rail (brand mark + subtitle, solid-fill active pill, a
 * "connected" status card and the workshop account), a light top bar with a
 * section breadcrumb + signed-in owner, a light content area, and a footer.
 */
export default function OwnerLayout({ children }: { children: React.ReactNode }) {
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
  dashboard: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/></svg>),
  profit: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 17l6-6 4 4 7-7"/><path d="M14 8h7v7"/></svg>),
  productivity: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18"/><path d="M7 15v3M12 9v9M17 5v13"/></svg>),
  receivables: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/></svg>),
  stock: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 8 12 3 3 8l9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/></svg>),
  ai: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4m0 4h.01"/></svg>),
  attendance: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>),
  rental: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 17h14M5 17a2 2 0 0 1-2-2V9l2-4h11l3 4v6a2 2 0 0 1-2 2M5 17v2M19 17v2"/><circle cx="7.5" cy="17" r="1.5"/><circle cx="16.5" cy="17" r="1.5"/></svg>),
  reports: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></svg>),
  data: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></svg>),
  import: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/></svg>),
  settings: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15H4.5a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 6 9.6l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 11 4.6V4.5a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 18 6l.06-.06a2 2 0 1 1 2.83 2.83L20.4 8.8A1.65 1.65 0 0 0 19.4 11h.1a2 2 0 1 1 0 4h-.1z"/></svg>),
};

type NavItem = { href: string; label: string; icon: string };
const NAV: NavItem[] = [
  { href: '/owner', label: 'Nadzorna plošča', icon: 'dashboard' },
  { href: '/owner/profitability', label: 'Profitabilnost', icon: 'profit' },
  { href: '/owner/productivity', label: 'Produktivnost', icon: 'productivity' },
  { href: '/owner/receivables', label: 'Terjatve', icon: 'receivables' },
  { href: '/owner/inventory', label: 'Zaloga', icon: 'stock' },
  { href: '/owner/insights', label: 'Opozorila AI', icon: 'ai' },
  { href: '/owner/attendance', label: 'Prisotnost', icon: 'attendance' },
  { href: '/owner/rental', label: 'Najem vozil', icon: 'rental' },
  { href: '/owner/reports', label: 'Poročila', icon: 'reports' },
  { href: '/owner/data', label: 'Podatki', icon: 'data' },
  { href: '/owner/imports', label: 'Uvoz', icon: 'import' },
  { href: '/owner/settings', label: 'Nastavitve', icon: 'settings' },
];

function activeItem(path: string): NavItem | undefined {
  return NAV.find((n) => (n.href === '/owner' ? path === n.href : path.startsWith(n.href)));
}

function Rail({ open, onClose }: { open: boolean; onClose: () => void }) {
  const path = usePathname() ?? '/owner';
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
        const active = n.href === '/owner' ? path === n.href : path.startsWith(n.href);
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

      <Link href="/owner/settings" className="mt-2 flex items-center gap-2.5 rounded-tool px-2 py-2 transition hover:bg-white/5">
        <span className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-white/10 text-white">
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 13h.01M9 17h.01M15 9h.01M15 13h.01M15 17h.01"/></svg>
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-sm font-bold text-white">{company || 'A-SPRINT Demo'}</span>
          <span className="block text-xs text-sidebartext">Lastnik</span>
        </span>
        <svg viewBox="0 0 24 24" className="h-4 w-4 flex-none text-sidebartext" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
      </Link>
    </aside>
  );
}

function TopBar({ onMenu }: { onMenu: () => void }) {
  const path = usePathname() ?? '/owner';
  const section = activeItem(path)?.label ?? 'Lastnik';
  const session = getSession();
  const name = session?.user.name ?? 'Lastnik';
  const initial = name.trim().charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-surface px-4 py-3 sm:gap-4 sm:px-6">
      <button onClick={onMenu} aria-label="Meni" className="grid h-10 w-10 flex-none place-items-center rounded-tool text-muted transition hover:bg-floor hover:text-ink lg:hidden">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
      </button>
      <nav className="flex items-center gap-2 text-sm">
        <span className="font-semibold text-muted2">Lastnik</span>
        <span className="text-linestrong">›</span>
        <span className="font-bold text-ink">{section}</span>
      </nav>
      <div className="ml-auto flex items-center gap-3">
        <button className="flex items-center gap-2.5 rounded-full border border-line py-1 pl-1 pr-2.5 transition hover:bg-floor">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-brandweak text-sm font-bold text-brand">{initial}</span>
          <span className="hidden leading-tight sm:block">
            <span className="block text-left text-sm font-bold text-ink">{name}</span>
            <span className="block text-left text-xs text-muted2">Lastnik</span>
          </span>
          <svg viewBox="0 0 24 24" className="h-4 w-4 flex-none text-muted2" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
        </button>
      </div>
    </header>
  );
}
