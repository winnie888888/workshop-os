'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getSession } from '@/lib/session';

/*
 * Owner shell — dark navy navigation rail (design spec, image 2) with the brand
 * mark, the owner's navigation, and the signed-in owner pinned at the bottom.
 * The content area is light; pages render their own header + date range.
 */
export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen grid-cols-[15rem_1fr] bg-floor">
      <Rail />
      <main className="min-w-0 p-6">{children}</main>
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
  settings: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15H4.5a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 6 9.6l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 11 4.6V4.5a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 18 6l.06-.06a2 2 0 1 1 2.83 2.83L20.4 8.8A1.65 1.65 0 0 0 19.4 11h.1a2 2 0 1 1 0 4h-.1z"/></svg>),
};

type NavItem = { href?: string; label: string; icon: string; soon?: boolean };
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
  { href: '/owner/settings', label: 'Nastavitve', icon: 'settings' },
];

function Rail() {
  const path = usePathname() ?? '/owner';
  const session = getSession();
  const name = session?.user.name ?? 'Lastnik';
  const initial = name.trim().charAt(0).toUpperCase();

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
        const active = n.href === '/owner' ? path === n.href : path.startsWith(n.href);
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
            <span className="block text-xs text-white/45">Lastnik</span>
          </span>
        </div>
        <Link href="/" className="px-3 text-xs font-semibold text-white/40 hover:text-white">← vsi vmesniki</Link>
      </div>
    </aside>
  );
}
