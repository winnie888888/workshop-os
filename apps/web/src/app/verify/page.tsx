'use client';

/**
 * /verify?token=... — potrditev e-maila. POST /public/verify žeton porabi
 * ENKRATNO (provisioning tenanta!), zato je klic zaščiten z ref pred React
 * strict-mode dvojnim efektom. useSearchParams v Next 14 zahteva Suspense
 * mejo, zato je vsebina ovita vanjo. Ob uspehu je uporabnik že prijavljen
 * (verifyLocal shrani sejo) in preusmerjen na nadzorno ploščo.
 */

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, Spinner } from '@/components/ui';
import { verifyLocal } from '@/lib/local-auth';

export default function VerifyPage() {
  return (
    <Suspense fallback={<Shell><Busy /></Shell>}>
      <VerifyInner />
    </Suspense>
  );
}

function VerifyInner() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token') ?? '';
  const ran = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (!token) { setError('Povezava je nepopolna — manjka potrditveni žeton.'); return; }
    verifyLocal(token)
      .then(() => router.replace('/advisor'))
      .catch((e) => setError(e instanceof Error ? e.message : 'Potrditev ni uspela.'));
  }, [token, router]);

  return (
    <Shell>
      {error ? (
        <Card className="p-7">
          <h1 className="mb-1 text-xl font-bold text-ink">Potrditev ni uspela</h1>
          <p className="mb-5 text-sm text-muted">{error}</p>
          <div className="flex flex-col gap-2 text-sm">
            <Link href="/signup" className="font-semibold text-brand hover:underline">Začnite registracijo znova</Link>
            <Link href="/" className="font-semibold text-brand hover:underline">Na prijavo</Link>
          </div>
        </Card>
      ) : (
        <Busy />
      )}
    </Shell>
  );
}

function Busy() {
  return (
    <Card className="flex items-center gap-3 p-7">
      <Spinner />
      <div>
        <p className="text-sm font-bold text-ink">Potrjujemo račun …</p>
        <p className="text-sm text-muted">Ustvarjamo vašo delavnico. Trenutek.</p>
      </div>
    </Card>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-floor">
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-[-14rem] h-[34rem] w-[70rem] -translate-x-1/2 rounded-full bg-brand/10 blur-[130px]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-10">
        <div className="mb-6 text-center">
          <div className="mx-auto inline-block rounded-2xl bg-white px-6 py-4 shadow-lift">
            <img src="/asprint-logo.png" alt="A-SPRINT GARAGE" className="h-10 w-auto" />
          </div>
        </div>
        {children}
      </div>
    </main>
  );
}
