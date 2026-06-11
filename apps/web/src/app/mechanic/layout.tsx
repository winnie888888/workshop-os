'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { subscribeQueue, pendingCount, startAutoFlush } from '@/lib/offline-queue';
import { useOnlineStatus } from '@/lib/hooks';

/*
 * The mechanic shell. A narrow, mobile-first, DARK frame (the shop-floor look
 * from the design spec): a slim sync/online status strip on top and a fixed
 * bottom tab bar. White cards sit on the dark background. The only system state
 * shown is sync — everything else the mechanic sees is their work.
 */
export default function MechanicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-[#0f1a2a] text-white">
      <SyncStrip />
      <div className="flex-1 px-4 pb-28 pt-2">{children}</div>
      <BottomNav />
    </div>
  );
}

function SyncStrip() {
  const online = useOnlineStatus();
  const [pending, setPending] = useState(0);
  useEffect(() => {
    const update = () => setPending(pendingCount());
    update();
    const unsub = subscribeQueue(update);
    const stop = startAutoFlush();
    return () => { unsub(); stop(); };
  }, []);

  const syncLabel = !online ? `${pending} shranjeno` : pending > 0 ? `sinhronizacija ${pending}…` : 'Sinhronizirano';
  const syncTone = !online ? 'bg-hold' : pending > 0 ? 'bg-info' : 'bg-go';

  return (
    <div className="flex items-center justify-end gap-4 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] text-[0.7rem] font-semibold text-white/70">
      <span className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${syncTone}`} />{syncLabel}</span>
      <span className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${online ? 'bg-go' : 'bg-white/30'}`} />{online ? 'Online' : 'Brez povezave'}</span>
    </div>
  );
}

const TABS = [
  { href: '/', label: 'Domov', match: (_p: string) => false,
    icon: (a: string) => (<svg viewBox="0 0 24 24" className={a} fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>) },
  { href: '/mechanic', label: 'Nalogi', match: (p: string) => p === '/mechanic' || p.startsWith('/mechanic/job'),
    icon: (a: string) => (<svg viewBox="0 0 24 24" className={a} fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>) },
  { href: '/mechanic/zgodovina', label: 'Zgodovina', match: (p: string) => p.startsWith('/mechanic/zgodovina'),
    icon: (a: string) => (<svg viewBox="0 0 24 24" className={a} fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>) },
  { href: '/mechanic/me', label: 'Profil', match: (p: string) => p.startsWith('/mechanic/me'),
    icon: (a: string) => (<svg viewBox="0 0 24 24" className={a} fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/></svg>) },
];

function BottomNav() {
  const pathname = usePathname() ?? '/mechanic';
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-md items-stretch border-t border-white/10 bg-[#0f1a2a]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      {TABS.map((t) => {
        const active = t.match(pathname);
        return (
          <Link key={t.href} href={t.href}
            className={`relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[0.7rem] font-bold transition ${active ? 'text-white' : 'text-white/45'}`}>
            {active && <span className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-brand" />}
            {t.icon('h-6 w-6')}
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
