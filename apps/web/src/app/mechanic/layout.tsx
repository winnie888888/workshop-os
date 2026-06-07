'use client';

import { useEffect, useState } from 'react';
import { subscribeQueue, pendingCount, startAutoFlush } from '@/lib/offline-queue';
import { useOnlineStatus } from '@/lib/hooks';

/*
 * The mechanic shell. A narrow, mobile-first frame with a single header whose
 * only system status is the sync indicator — the one piece of system state the
 * Mechanic UX Principles allow. Everything else the mechanic sees is their work.
 */
export default function MechanicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-screen max-w-md bg-floor">
      <MechanicHeader />
      <div className="px-4 pb-28 pt-3">{children}</div>
    </div>
  );
}

function MechanicHeader() {
  const online = useOnlineStatus();
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const update = () => setPending(pendingCount());
    update();
    const unsub = subscribeQueue(update);
    const stop = startAutoFlush();
    return () => { unsub(); stop(); };
  }, []);

  // The indicator never blocks; it only labels "saved here" vs "synced".
  const label = !online
    ? `${pending} saved on this device`
    : pending > 0
      ? `syncing ${pending}…`
      : 'all synced';
  const tone = !online ? 'bg-hold' : pending > 0 ? 'bg-info' : 'bg-go';

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line
      bg-ink px-4 py-3 text-white">
      <span className="font-display text-lg font-extrabold tracking-tight">A-SPRINT · Bay</span>
      <span className="flex items-center gap-2 text-xs font-semibold">
        <span className={`h-2.5 w-2.5 rounded-full ${tone}`} />
        {label}
      </span>
    </header>
  );
}
