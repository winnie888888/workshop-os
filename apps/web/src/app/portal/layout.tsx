'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getPortalSession, setPortalSession } from '@/lib/portal-api';
import { DEMO_MODE } from '@/lib/demo';
import { BottomNav } from './portal-ui';

/*
 * Portal shell. It does two jobs. First, it is an AUTH GATE: every portal screen
 * except the sign-in page (/portal/enter) requires a portal session; if there is
 * none, we send the visitor to /portal/enter. Second, it provides the mobile
 * chrome — a slim top bar and a bottom tab nav — shared by every screen.
 *
 * In demo mode we plant a demo portal session automatically, so the portal opens
 * straight in from the shared link with no magic-link round trip.
 */
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const isEnter = path?.startsWith('/portal/enter');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (DEMO_MODE && !getPortalSession()) {
      // Auto-sign-in as the demo customer so the link "just works".
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

  return (
    <div className="min-h-screen bg-floor text-ink">
      {!isEnter && (
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-panel px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <span className="font-display text-lg font-extrabold tracking-tight text-info">A-SPRINT</span>
          <span className="text-xs font-semibold uppercase tracking-widest text-steel">Customer Portal</span>
        </header>
      )}
      <main className={isEnter ? '' : 'mx-auto max-w-xl px-4 pb-24 pt-4'}>{children}</main>
      {!isEnter && <BottomNav />}
    </div>
  );
}
