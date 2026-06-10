'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSession, setSession, selectTenant, requireSession, type Session } from '@/lib/session';
import { beginLogin } from '@/lib/oidc';
import { api } from '@/lib/api';
import { startAutoFlush } from '@/lib/offline-queue';
import { Button, Card, Spinner, ProblemBanner } from '@/components/ui';
import { DEMO_MODE, DEV_AUTH, planDevSession } from '@/lib/demo';
import { loginLocal } from '@/lib/local-auth';
import { DemoShare } from '@/components/share';

/*
 * Entry / launcher. Premium product entry: ambient brand glow, centred hero,
 * a compact signed-in identity chip, and the interfaces as a refined card grid.
 * Real OIDC login (Authorization Code + PKCE) is unchanged.
 */

type IfaceIcon = (p: { className?: string }) => JSX.Element;
const INTERFACES: { href: string; title: string; sub: string; icon: IfaceIcon }[] = [
  {
    href: '/advisor', title: 'Servisni svetovalec', sub: 'Pult — nalogi, stranke, računi',
    icon: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h6"/></svg>),
  },
  {
    href: '/mechanic', title: 'Mehanik', sub: 'Delavnica — ura, postavke, fotografije',
    icon: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a4 4 0 0 1-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 1 5.4-5.4l-2.7 2.7-2.3-.4-.4-2.3 2.7-2.7Z"/></svg>),
  },
  {
    href: '/owner', title: 'Lastnik', sub: 'Nadzorna plošča — pregled poslovanja',
    icon: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18"/><rect x="7" y="10" width="3" height="7"/><rect x="12" y="6" width="3" height="11"/><rect x="17" y="13" width="3" height="4"/></svg>),
  },
  {
    href: '/warehouse', title: 'Skladišče', sub: 'Zaloga, prevzem, dobavitelji',
    icon: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9 12 4l9 5v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M3 9h18M9 21V13h6v8"/></svg>),
  },
  {
    href: '/employee', title: 'Moj delovni čas', sub: 'Prihod/odhod in potni nalogi',
    icon: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>),
  },
  {
    href: '/portal', title: 'Portal stranke', sub: 'Vozila, nalogi, odobritve, računi',
    icon: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11"/></svg>),
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

  const tenantName = session?.memberships.find((m) => m.tenantId === session?.tenantId)?.tenantName ?? 'Delavnica';

  return (
    <main className="relative min-h-screen overflow-hidden bg-floor">
      {/* ambient brand glow */}
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-[-14rem] h-[34rem] w-[70rem] -translate-x-1/2 rounded-full bg-brand/10 blur-[130px]" />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_30rem_at_50%_-10%,rgba(37,99,235,0.06),transparent)]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-10 sm:py-16">
        {/* Hero — navy band with the brand logo on a clean white plaque */}
        <header className="relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-sidebar2 via-sidebar to-[#0a1626] px-8 py-12 text-center shadow-lift sm:py-14">
          <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-64 w-[40rem] -translate-x-1/2 rounded-full bg-brand/25 blur-[90px]" />
          <div className="relative flex flex-col items-center gap-4">
            <div className="rounded-2xl bg-white px-8 py-6 shadow-lift">
              <img src="/asprint-logo.png" alt="A-SPRINT GARAGE" className="h-14 w-auto sm:h-[4.5rem]" />
            </div>
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.3em] text-white/45">Operacijski sistem delavnice</p>
          </div>
        </header>

        {error && <div className="mx-auto mt-6 w-full max-w-md"><ProblemBanner message={error} /></div>}

        {!session ? (
          <div className="mx-auto mt-10 w-full max-w-md">
            <Card className="p-7">
              <h2 className="mb-1 text-xl font-bold text-ink">Dobrodošli</h2>
              {DEMO_MODE ? (
                <>
                  <p className="mb-5 text-sm text-muted">
                    Preusmerjeni boste na varni prijavni sistem vaše delavnice in nato vrnjeni sem.
                    Aplikacija nikoli ne obdeluje gesla.
                  </p>
                  <Button tone="info" size="lg" full onClick={login} disabled={loading}>
                    {loading ? <Spinner /> : 'Prijava z računom delavnice'}
                  </Button>
                </>
              ) : (
                <>
                  <p className="mb-5 text-sm text-muted">Prijavite se z e-naslovom svoje delavnice.</p>
                  <LocalLoginForm onLoggedIn={setLocal} />
                  <div className="my-5 flex items-center gap-3 text-[0.65rem] font-bold uppercase tracking-wide text-muted2">
                    <span className="h-px flex-1 bg-line" />ali<span className="h-px flex-1 bg-line" />
                  </div>
                  <Button tone="neutral" full onClick={login} disabled={loading}>
                    {loading ? <Spinner /> : 'SSO prijava (podjetja)'}
                  </Button>
                  <p className="mt-5 text-center text-sm text-muted">
                    Nova delavnica?{' '}
                    <Link href="/signup" className="font-semibold text-brand hover:underline">Ustvarite račun</Link>
                  </p>
                </>
              )}
              {DEV_AUTH && (
                <button onClick={() => setLocal(planDevSession())}
                  className="mt-3 w-full rounded-tool border border-line py-2.5 text-sm font-semibold text-steel transition hover:border-brandring hover:text-brand">
                  Dev prijava (lokalno)
                </button>
              )}
            </Card>
          </div>
        ) : !session.tenantId ? (
          <div className="mx-auto mt-10 w-full max-w-md"><TenantPicker session={session} onPicked={setLocal} /></div>
        ) : (
          <>
            {/* Signed-in identity chip */}
            <div className="mx-auto mt-8 flex w-full max-w-md items-center gap-3 rounded-full border border-line bg-surface px-4 py-2.5 shadow-card">
              <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-gradient-to-br from-brand to-brand700 text-sm font-bold text-white">
                {session.user.name.trim().charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block text-[0.6rem] font-bold uppercase tracking-wide text-muted2">Prijavljen kot</span>
                <span className="block truncate text-sm font-bold text-ink">{session.user.name} <span className="font-normal text-muted">· {tenantName}</span></span>
              </span>
              {session.memberships.length > 1 && (
                <button onClick={() => { setSession({ ...session, tenantId: '' }); setLocal({ ...session, tenantId: '' }); }}
                  className="flex-none text-xs font-semibold text-brand hover:underline">zamenjaj</button>
              )}
            </div>

            {/* Install-as-app hint (mobile only) */}
            <div className="mx-auto mt-6 flex w-full max-w-md items-center gap-2.5 rounded-tool border border-brandring bg-brandweak px-4 py-3 text-sm text-ink md:hidden">
              <svg viewBox="0 0 24 24" className="h-5 w-5 flex-none text-brand" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M12 7v6M9.5 10.5 12 13l2.5-2.5"/></svg>
              <span>Namesti kot aplikacijo — v meniju brskalnika izberi <span className="font-semibold">»Dodaj na začetni zaslon«</span>.</span>
            </div>

            {/* Interface grid */}
            <section className="mt-10">
              <div className="mb-4 flex items-center gap-3">
                <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-muted2">Izberite vmesnik</h2>
                <span className="h-px flex-1 bg-line" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger">
                {INTERFACES.map((it) => {
                  const Ic = it.icon;
                  return (
                    <Link key={it.href} href={it.href}
                      className="group relative flex flex-col gap-3 overflow-hidden rounded-card border border-line bg-surface p-5 shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-brandring hover:shadow-lift">
                      <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] origin-left scale-x-0 bg-gradient-to-r from-brand to-brand700 transition-transform duration-200 group-hover:scale-x-100" />
                      <span className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand700 text-white shadow-tool">
                        <Ic className="h-6 w-6" />
                      </span>
                      <span>
                        <span className="flex items-center gap-1.5 text-lg font-bold text-ink">
                          {it.title}
                          <svg viewBox="0 0 24 24" className="h-4 w-4 text-muted2 transition group-hover:translate-x-0.5 group-hover:text-brand" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
                        </span>
                        <span className="mt-0.5 block text-sm text-muted">{it.sub}</span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>

            {/* Footer */}
            <footer className="mt-auto flex flex-col items-center gap-6 pt-12">
              <button onClick={logout} className="text-sm font-semibold text-muted hover:text-stop">Odjava</button>
              {DEMO_MODE && (
                <div className="w-full max-w-md opacity-90">
                  <DemoShare />
                </div>
              )}
              <p className="num text-xs text-muted2">A-SPRINT Workshop OS · 2026</p>
            </footer>
          </>
        )}
      </div>
    </main>
  );
}

function TenantPicker({ session, onPicked }: { session: Session; onPicked: (s: Session) => void }) {
  function pick(tenantId: string) {
    selectTenant(tenantId);
    onPicked(requireSession());
  }
  return (
    <Card className="p-7">
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

/** Lokalna prijava (email+geslo) — Faza A. OIDC ostaja kot SSO pot zgoraj. */
function LocalLoginForm({ onLoggedIn }: { onLoggedIn: (s: Session) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (!email.trim() || !password) { setErr('Vpišite e-naslov in geslo.'); return; }
    setBusy(true); setErr(null);
    try { onLoggedIn(await loginLocal(email, password)); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Prijava ni uspela.'); }
    finally { setBusy(false); }
  }

  const inputCls =
    'h-11 w-full rounded-tool border border-line bg-surface2 px-3 text-sm transition focus:border-brandring focus:bg-surface focus:outline-none focus:ring-4 focus:ring-brandweak';
  return (
    <div className="flex flex-col gap-3">
      {err && <ProblemBanner message={err} />}
      <label className="block">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted2">E-naslov</span>
        <input type="email" autoComplete="email" value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void submit(); }} className={inputCls} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted2">Geslo</span>
        <input type="password" autoComplete="current-password" value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void submit(); }} className={inputCls} />
      </label>
      <Button tone="info" size="lg" full onClick={submit} disabled={busy}>
        {busy ? <Spinner /> : 'Prijava'}
      </Button>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted2">
        <Link href="/predstavitev" className="hover:text-ink">Predstavitev</Link>
        <Link href="/cenik" className="hover:text-ink">Cenik</Link>
        <Link href="/pravno/pogoji" className="hover:text-ink">Pogoji</Link>
        <Link href="/pravno/zasebnost" className="hover:text-ink">Zasebnost</Link>
      </div>
    </div>
  );
}
