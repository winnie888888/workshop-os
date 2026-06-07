'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getPortalSession, setPortalSession, portalApi } from '@/lib/portal-api';
import { DEMO_MODE } from '@/lib/demo';
import { BottomNav } from './portal-ui';

/*
 * Portal shell. Auth gate + chrome. On phones it keeps the calm customer look
 * with a slim top bar and a bottom tab nav; on desktop it adopts the same dark
 * navy rail as the rest of the product, so the whole suite feels like one app.
 */
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const isEnter = path?.startsWith('/portal/enter');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (DEMO_MODE && !getPortalSession()) {
      setPortalSession({
        sessionToken: 'demo-portal-session',
        tenantId: '00000000-0000-0000-0000-0000000a5b71',
        customerId: 'cust-horvat',
        customerName: 'Transport Horvat d.o.o.',
      });
    }
    if (!isEnter && !getPortalSession()) {
      router.replace('/portal/enter');
      return;
    }
    setReady(true);
  }, [isEnter, router]);

  if (!ready && !isEnter) return null;

  if (isEnter) {
    return <div className="min-h-screen bg-floor text-ink"><main>{children}</main></div>;
  }

  async function logout() {
    try { await portalApi.logout(); } catch { /* ignore */ }
    setPortalSession(null);
    router.push('/portal/enter');
  }

  return (
    <div className="min-h-screen bg-floor text-ink lg:grid lg:grid-cols-[15rem_1fr]">
      <Rail onLogout={logout} />
      <div className="min-w-0">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] lg:hidden">
          <span className="flex items-center gap-2">
            <img src="/asprint-mark.png" alt="A-SPRINT" className="h-7 w-7 object-contain" />
            <span className="text-base font-extrabold tracking-tight text-ink">A-SPRINT</span>
          </span>
          <span className="text-xs font-semibold uppercase tracking-widest text-muted2">Portal</span>
        </header>
        <main className="mx-auto max-w-xl px-4 pb-24 pt-4 lg:mx-0 lg:max-w-5xl lg:px-8 lg:pb-10 lg:pt-8">{children}</main>
      </div>
      <div className="lg:hidden"><BottomNav /></div>
    </div>
  );
}

type Icon = (p: { className?: string }) => JSX.Element;
const I: Record<string, Icon> = {
  home: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>),
  jobs: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 7l3 3-7 7-3-3z"/><path d="M3 21l3-1 11-11-2-2L4 18z"/></svg>),
  approvals: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>),
  invoices: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2h9l3 3v17l-3-2-3 2-3-2-3 2V2Z"/><path d="M9 8h6M9 12h6"/></svg>),
  history: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>),
  book: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>),
  docs: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>),
  messages: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>),
};

type NavItem = { href?: string; label: string; icon: string; soon?: boolean };
const NAV: NavItem[] = [
  { href: '/portal', label: 'Domov', icon: 'home' },
  { href: '/portal/work-orders', label: 'Moji nalogi', icon: 'jobs' },
  { href: '/portal/approvals', label: 'Odobritve', icon: 'approvals' },
  { href: '/portal/invoices', label: 'Računi', icon: 'invoices' },
  { href: '/portal/history', label: 'Zgodovina', icon: 'history' },
  { href: '/portal/appointments', label: 'Najava servisa', icon: 'book' },
  { label: 'Dokumenti', icon: 'docs', soon: true },
  { label: 'Sporočila', icon: 'messages', soon: true },
];

function Rail({ onLogout }: { onLogout: () => void }) {
  const path = usePathname() ?? '/portal';
  const session = getPortalSession();
  const name = session?.customerName ?? 'Stranka';
  const initial = name.trim().charAt(0).toUpperCase();
  return (
    <aside className="hidden flex-col gap-0.5 bg-sidebar px-3 pb-3 text-sidebartext lg:flex">
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
        const active = n.href === '/portal' ? path === n.href : path.startsWith(n.href);
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
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-sm font-bold text-white">{name}</span>
            <span className="block text-xs text-white/45">Stranka</span>
          </span>
        </div>
        <button onClick={onLogout} className="px-3 py-1 text-left text-xs font-semibold text-white/40 hover:text-white">Odjava</button>
      </div>
    </aside>
  );
}
