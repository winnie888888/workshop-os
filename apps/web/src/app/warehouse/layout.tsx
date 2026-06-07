'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getSession } from '@/lib/session';

/*
 * Warehouse shell — dark navy navigation rail (design spec) with the brand mark
 * and the warehouse navigation, light content area. The receiving workflow lives
 * under /warehouse/receiving; the overview (stock value, low stock) is the home.
 */
export default function WarehouseLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen grid-cols-[15rem_1fr] bg-floor">
      <Rail />
      <main className="min-w-0 p-6">{children}</main>
    </div>
  );
}

type Icon = (p: { className?: string }) => JSX.Element;
const I: Record<string, Icon> = {
  overview: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 8 12 3 3 8l9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/></svg>),
  receive: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12m0 0 4-4m-4 4-4-4"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>),
  items: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>),
  moves: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/></svg>),
  count: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h11"/></svg>),
  suppliers: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9h13v8H3z"/><path d="M16 13h4l1 4h-5z"/><circle cx="7" cy="18" r="1.5"/><circle cx="18" cy="18" r="1.5"/></svg>),
  settings: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15H4.5a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 6 9.6l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 11 4.6V4.5a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 18 6l.06-.06a2 2 0 1 1 2.83 2.83L20.4 8.8A1.65 1.65 0 0 0 19.4 11h.1a2 2 0 1 1 0 4h-.1z"/></svg>),
};

type NavItem = { href?: string; label: string; icon: string; soon?: boolean };
const NAV: NavItem[] = [
  { href: '/warehouse', label: 'Pregled', icon: 'overview' },
  { href: '/warehouse/receiving', label: 'Prejem blaga', icon: 'receive' },
  { label: 'Postavke', icon: 'items', soon: true },
  { label: 'Premiki', icon: 'moves', soon: true },
  { label: 'Inventura', icon: 'count', soon: true },
  { label: 'Dobavitelji', icon: 'suppliers', soon: true },
  { label: 'Nastavitve', icon: 'settings', soon: true },
];

function Rail() {
  const path = usePathname() ?? '/warehouse';
  const session = getSession();
  const name = session?.user.name ?? 'Skladišče';
  const initial = name.trim().charAt(0).toUpperCase();
  return (
    <aside className="flex flex-col gap-0.5 bg-sidebar px-3 pb-3 text-sidebartext">
      <div className="flex items-center gap-2.5 px-2 pb-5 pt-4">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand700 text-base font-extrabold text-white shadow-tool">A</div>
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
        const active = n.href === '/warehouse' ? path === n.href : path.startsWith(n.href);
        return (
          <Link key={n.href} href={n.href}
            className={`relative flex items-center gap-3 rounded-tool px-3 py-2.5 font-semibold transition
              ${active ? 'bg-sidebar2 text-white' : 'text-sidebartext hover:bg-white/5 hover:text-white'}`}>
            {active && <span className="absolute bottom-2 left-0 top-2 w-[3px] rounded-r bg-brand" />}
            <Ic className="h-[18px] w-[18px]" />{n.label}
          </Link>
        );
      })}
      <div className="mt-auto flex flex-col gap-2 pt-3">
        <div className="flex items-center gap-2.5 rounded-tool px-2 py-2">
          <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-brand text-sm font-bold text-white">{initial}</span>
          <span className="leading-tight">
            <span className="block text-sm font-bold text-white">{name}</span>
            <span className="block text-xs text-white/45">Skladišče</span>
          </span>
        </div>
        <Link href="/" className="px-3 text-xs font-semibold text-white/40 hover:text-white">← vsi vmesniki</Link>
      </div>
    </aside>
  );
}
