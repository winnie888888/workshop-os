'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSession, setSession, selectTenant, requireSession, type Session } from '@/lib/session';
import { beginLogin } from '@/lib/oidc';
import { api } from '@/lib/api';
import { startAutoFlush } from '@/lib/offline-queue';
import { Button, Card, Spinner, ProblemBanner } from '@/components/ui';
import { DEMO_MODE } from '@/lib/demo';
import { DemoShare } from '@/components/share';

/*
 * Entry / launcher. The real OIDC login replaces the old development sign-in:
 * pressing "Prijava" runs the Authorization Code + PKCE flow against the
 * configured identity provider. After the callback returns, the session holds
 * the user's identity and tenant memberships; if they belong to more than one
 * workshop the picker is shown, otherwise we go straight to the interfaces.
 */

type IfaceIcon = (p: { className?: string }) => JSX.Element;
const INTERFACES: { href: string; title: string; sub: string; icon: IfaceIcon }[] = [
  {
    href: '/mechanic', title: 'Mehanik', sub: 'Delavnica — ura, postavke, fotografije',
    icon: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a4 4 0 0 1-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 1 5.4-5.4l-2.7 2.7-2.3-.4-.4-2.3 2.7-2.7Z"/></svg>),
  },
  {
    href: '/advisor', title: 'Servisni svetovalec', sub: 'Pult — nalogi, stranke, računi',
    icon: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h6"/></svg>),
  },
  {
    href: '/owner', title: 'Lastnik', sub: 'Nadzorna plošča — pregled poslovanja',
    icon: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18"/><rect x="7" y="10" width="3" height="7"/><rect x="12" y="6" width="3" height="11"/><rect x="17" y="13" width="3" height="4"/></svg>),
  },
  {
    href: '/employee', title: 'Moj delovni čas', sub: 'Prihod/odhod in potni nalogi',
    icon: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>),
  },
];

export default function Home() {
  const [session, setLocal] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLocal(getSession());
    const stop = startAutoFlush();
    return stop;
  }, []);

  async function login() {
    setLoading(true); setError(null);
    try { await beginLogin(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Prijave ni bilo mogoče začeti'); setLoading(false); }
  }

  async function logout() {
    try { await api.auth.logout({ deviceId: localStorage.getItem('wos.deviceId') ?? undefined }); } catch { /* ignore */ }
    setSession(null); setLocal(null);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-6">
      <header className="pt-10">
        <div className="flex flex-col gap-2">
          <img src="/asprint-logo.png" alt="A-SPRINT GARAGE" className="h-16 w-auto sm:h-20" />
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted2">Operacijski sistem delavnice</p>
        </div>
      </header>

      {error && <ProblemBanner message={error} />}

      {!session ? (
        <Card className="p-6 stagger">
          <h2 className="mb-1 text-xl font-bold text-ink">Prijava</h2>
          <p className="mb-4 text-sm text-muted">
            Preusmerjeni boste na varni prijavni sistem vaše delavnice in nato vrnjeni sem.
            Aplikacija nikoli ne obdeluje gesla.
          </p>
          <Button tone="info" size="lg" full onClick={login} disabled={loading}>
            {loading ? <Spinner /> : 'Prijava z računom delavnice'}
          </Button>
        </Card>
      ) : !session.tenantId ? (
        <TenantPicker session={session} onPicked={setLocal} />
      ) : (
        <>
          <Card className="flex items-center gap-4 p-5">
            <div className="grid h-12 w-12 flex-none place-items-center rounded-xl bg-brandweak text-lg font-extrabold text-brand">
              {session.user.name.trim().charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-muted2">Prijavljen kot</p>
              <p className="truncate text-xl font-bold text-ink">{session.user.name}</p>
              <p className="truncate text-sm text-muted">
                {session.memberships.find((m) => m.tenantId === session.tenantId)?.tenantName ?? 'Delavnica'}
                {session.memberships.length > 1 && (
                  <button onClick={() => { setSession({ ...session, tenantId: '' }); setLocal({ ...session, tenantId: '' }); }}
                    className="ml-2 font-semibold text-brand hover:underline">zamenjaj</button>
                )}
              </p>
            </div>
          </Card>

          <div className="grid gap-3 stagger">
            {INTERFACES.map((it) => {
              const Ic = it.icon;
              return (
                <Link key={it.href} href={it.href}
                  className="group flex items-center gap-4 rounded-card border border-line bg-surface p-4 shadow-card transition hover:border-brandring hover:shadow-lift active:translate-y-px">
                  <span className="grid h-12 w-12 flex-none place-items-center rounded-xl bg-brandweak text-brand">
                    <Ic className="h-6 w-6" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg font-bold text-ink">{it.title}</span>
                    <span className="block truncate text-sm text-muted">{it.sub}</span>
                  </span>
                  <svg viewBox="0 0 24 24" className="h-5 w-5 flex-none text-muted2 transition group-hover:translate-x-0.5 group-hover:text-brand" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
                </Link>
              );
            })}
          </div>

          <button onClick={logout} className="mt-auto text-sm font-semibold text-stop hover:underline">Odjava</button>

          {DEMO_MODE && <DemoShare />}
        </>
      )}
    </main>
  );
}

function TenantPicker({ session, onPicked }: { session: Session; onPicked: (s: Session) => void }) {
  function pick(tenantId: string) {
    selectTenant(tenantId);
    onPicked(requireSession());
  }
  return (
    <Card className="p-6">
      <h2 className="mb-1 text-xl font-bold text-ink">Izberi delavnico</h2>
      <p className="mb-4 text-sm text-muted">Dostop imaš do več delavnic. Izberi, v kateri želiš delati.</p>
      <div className="grid gap-3">
        {session.memberships.map((m) => (
          <Button key={m.tenantId} tone="info" size="lg" full onClick={() => pick(m.tenantId)}>
            {m.tenantName}
          </Button>
        ))}
      </div>
    </Card>
  );
}
