'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { portalApi, setPortalSession, PortalApiError } from '@/lib/portal-api';
import { PortalButton } from '../portal-ui';

/*
 * Portal entry. This single page is the target of the SMS/email deep link AND
 * the manual sign-in screen, because both end the same way — establishing a
 * portal session.
 *
 *  - If the URL carries ?token=… (the magic link), we verify it, store the
 *    session, and go to the home screen. This is the "tap the link in Viber/SMS"
 *    path: no typing at all.
 *  - Otherwise we show a simple form to REQUEST a link by email or phone. The
 *    response is intentionally neutral (we never say whether the contact
 *    matched), and we tell the customer to check their messages.
 *
 * For the tenant, we read it from the link (?t=) when present, falling back to a
 * configured default — a real deployment serves one workshop's portal per host.
 */
function PortalEnterInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [state, setState] = useState<'idle' | 'verifying' | 'requesting' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const [channel, setChannel] = useState<'sms' | 'email'>('email');
  const [contact, setContact] = useState('');

  // The default tenant for the request form (one workshop per portal host).
  const tenantId = params.get('t') ?? process.env.NEXT_PUBLIC_PORTAL_TENANT_ID ?? '00000000-0000-0000-0000-0000000a5b71';

  // Magic-link path: a token in the URL means "verify and sign in".
  useEffect(() => {
    const token = params.get('token');
    if (!token) return;
    setState('verifying');
    portalApi.verify(token)
      .then((session) => { setPortalSession(session); router.replace('/portal'); })
      .catch((e) => {
        setError(e instanceof PortalApiError ? e.message : 'Ta prijavna povezava je neveljavna ali je potekla.');
        setState('error');
      });
  }, [params, router]);

  async function requestLink() {
    if (!contact.trim()) { setError('Vnesite e-pošto ali telefonsko številko.'); return; }
    setState('requesting'); setError(null);
    try {
      await portalApi.requestLink(tenantId, contact.trim(), channel);
      setState('sent');
    } catch (e) {
      setError(e instanceof PortalApiError ? e.message : 'Povezave ni bilo mogoče poslati. Poskusite znova.');
      setState('error');
    }
  }

  return (
    <div className="flex min-h-screen flex-col justify-center bg-sidebar px-6 text-white">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8 text-center">
          <img src="/asprint-mark.png" alt="A-SPRINT" className="mx-auto mb-3 h-16 w-auto" />
          <div className="text-4xl font-extrabold tracking-tight text-brand">A-SPRINT</div>
          <p className="mt-1 text-sm font-semibold uppercase tracking-[0.2em] text-white/60">Portal za stranke</p>
        </div>

        {state === 'verifying' && (
          <p className="text-center text-white/80">Prijavljanje…</p>
        )}

        {state === 'sent' && (
          <div className="rounded-2xl bg-white/10 p-5 text-center">
            <p className="text-lg font-bold">Preverite sporočila</p>
            <p className="mt-2 text-sm text-white/80">
              Če {channel === 'email' ? 'ta e-pošta' : 'ta številka'} pripada naši stranki, smo poslali
              prijavno povezavo. Tapnite jo za odprtje portala. Povezava velja 15 minut.
            </p>
          </div>
        )}

        {(state === 'idle' || state === 'requesting' || state === 'error') && !params.get('token') && (
          <div className="rounded-2xl bg-white/5 p-5">
            <p className="mb-4 text-sm text-white/80">
              Prijavite se za pregled vozil, spremljanje popravil, odobritev del in vpogled v račune.
              Pošljemo vam povezavo z enim tapom — brez gesel za pomnjenje.
            </p>
            <div className="mb-3 flex gap-2">
              <button onClick={() => setChannel('email')}
                className={`flex-1 rounded-xl py-2 text-sm font-semibold ${channel === 'email' ? 'bg-brand text-white' : 'bg-white/10'}`}>E-pošta</button>
              <button onClick={() => setChannel('sms')}
                className={`flex-1 rounded-xl py-2 text-sm font-semibold ${channel === 'sms' ? 'bg-brand text-white' : 'bg-white/10'}`}>SMS</button>
            </div>
            <input value={contact} onChange={(e) => setContact(e.target.value)}
              inputMode={channel === 'email' ? 'email' : 'tel'}
              placeholder={channel === 'email' ? 'vi@podjetje.si' : '+386 …'}
              className="mb-3 w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/40 focus:border-brand focus:outline-none" />
            {error && <p className="mb-3 text-sm font-semibold text-stop">{error}</p>}
            <button onClick={requestLink} disabled={state === 'requesting'}
              className="w-full rounded-xl bg-brand py-3 text-base font-bold text-white active:scale-[0.98] disabled:opacity-50">
              {state === 'requesting' ? 'Pošiljanje…' : 'Pošlji mi prijavno povezavo'}
            </button>
          </div>
        )}

        {state === 'error' && params.get('token') && (
          <div className="rounded-2xl bg-white/10 p-5 text-center">
            <p className="text-lg font-bold text-stop">Težava s povezavo</p>
            <p className="mt-2 text-sm text-white/80">{error}</p>
            <div className="mt-4"><PortalButton href="/portal/enter" tone="primary">Zahtevaj novo povezavo</PortalButton></div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PortalEnter() {
  return (
    <Suspense fallback={null}>
      <PortalEnterInner />
    </Suspense>
  );
}
