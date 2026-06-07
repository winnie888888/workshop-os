'use client';

import { useEffect, useState } from 'react';
import { ensureDemoSession, DEMO_MODE } from '@/lib/demo';

/**
 * Demo bootstrap. Mounted once in the root layout, it plants the demo session
 * into localStorage before the rest of the app reads it, so in demo mode the
 * launcher sees a signed-in user and never starts the OIDC login flow. In a
 * production build (DEMO_MODE off) this renders nothing and does nothing.
 *
 * It must be a client component because localStorage only exists in the browser;
 * the tiny `ready` gate avoids a flash of the logged-out launcher on first paint.
 */
export function DemoBootstrap({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(!DEMO_MODE);

  useEffect(() => {
    if (DEMO_MODE) {
      ensureDemoSession();
      setReady(true);
    }
  }, []);

  if (!ready) return null;
  return <>{children}</>;
}
