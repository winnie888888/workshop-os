'use client';

import { useEffect, useState } from 'react';
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
export default function PortalEnter() {
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
        setError(e instanceof PortalApiError ? e.message : 'This sign-in link is invalid or has expired.');
        setState('error');
      });
  }, [params, router]);

  async function requestLink() {
    if (!contact.trim()) { setError('Enter your email or phone number.'); return; }
    setState('requesting'); setError(null);
    try {
      await portalApi.requestLink(tenantId, contact.trim(), channel);
      setState('sent');
    } catch (e) {
      setError(e instanceof PortalApiError ? e.message : 'Could not send the link. Please try again.');
      setState('error');
    }
  }

  return (
    <div className="flex min-h-screen flex-col justify-center bg-ink px-6 text-white">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="font-display text-4xl font-extrabold tracking-tight text-safety">A-SPRINT</div>
          <p className="mt-1 text-sm font-semibold uppercase tracking-[0.2em] text-white/60">Customer Portal</p>
        </div>

        {state === 'verifying' && (
          <p className="text-center text-white/80">Signing you in…</p>
        )}

        {state === 'sent' && (
          <div className="rounded-2xl bg-white/10 p-5 text-center">
            <p className="text-lg font-bold">Check your messages</p>
            <p className="mt-2 text-sm text-white/80">
              If that {channel === 'email' ? 'email' : 'number'} belongs to a customer of ours, we have sent a
              sign-in link. Tap it to open your portal. The link is valid for 15 minutes.
            </p>
          </div>
        )}

        {(state === 'idle' || state === 'requesting' || state === 'error') && !params.get('token') && (
          <div className="rounded-2xl bg-white/5 p-5">
            <p className="mb-4 text-sm text-white/80">
              Sign in to see your vehicles, track repairs, approve work and view invoices. We send a one-tap link —
              no password to remember.
            </p>
            <div className="mb-3 flex gap-2">
              <button onClick={() => setChannel('email')}
                className={`flex-1 rounded-xl py-2 text-sm font-semibold ${channel === 'email' ? 'bg-safety text-ink' : 'bg-white/10'}`}>Email</button>
              <button onClick={() => setChannel('sms')}
                className={`flex-1 rounded-xl py-2 text-sm font-semibold ${channel === 'sms' ? 'bg-safety text-ink' : 'bg-white/10'}`}>SMS</button>
            </div>
            <input value={contact} onChange={(e) => setContact(e.target.value)}
              inputMode={channel === 'email' ? 'email' : 'tel'}
              placeholder={channel === 'email' ? 'you@company.com' : '+386 …'}
              className="mb-3 w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/40 focus:border-safety focus:outline-none" />
            {error && <p className="mb-3 text-sm font-semibold text-stop">{error}</p>}
            <button onClick={requestLink} disabled={state === 'requesting'}
              className="w-full rounded-xl bg-safety py-3 text-base font-bold text-ink active:scale-[0.98] disabled:opacity-50">
              {state === 'requesting' ? 'Sending…' : 'Send me a sign-in link'}
            </button>
          </div>
        )}

        {state === 'error' && params.get('token') && (
          <div className="rounded-2xl bg-white/10 p-5 text-center">
            <p className="text-lg font-bold text-stop">Link problem</p>
            <p className="mt-2 text-sm text-white/80">{error}</p>
            <div className="mt-4"><PortalButton href="/portal/enter" tone="primary">Request a new link</PortalButton></div>
          </div>
        )}
      </div>
    </div>
  );
}
