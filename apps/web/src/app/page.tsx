'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSession, setSession, selectTenant, requireSession, type Session } from '@/lib/session';
import { beginLogin } from '@/lib/oidc';
import { api } from '@/lib/api';
import { startAutoFlush } from '@/lib/offline-queue';
import { Button, Card, Spinner, ProblemBanner } from '@/components/ui';
import { DEMO_MODE, DEV_AUTH, planDevSession } from '@/lib/demo';
import { loginLocal } from '@/lib/local-auth';
import { DemoShare } from '@/components/share';

/*
 * Vstop / domači zaslon (redesign po potrjenem mockupu, jun 2026).
 *
 * Odjavljen del (lokalna prijava, SSO, dev prijava) in izbira delavnice sta
 * NEDOTAKNJENA — spremenjen je samo prijavljeni pogled: namesto razvojnega
 * "Izberite vmesnik" je personaliziran dom — logo + zvonec z neprebranimi,
 * iskalnik z živimi zadetki (isti /search kot advisorjeva ukazna vrstica),
 * kartica "Vprašaj inteligenco" (fokusira iskalnik), pozdrav po uri dneva in
 * ploščice, filtrirane po vlogah seje: mehanik vidi svoje, svetovalec svoje,
 * lastnik vse + portal. Spodnja mobilna navigacija (Domov/+/Obvestila) je
 * zavestno preložena na prenovo lupin vmesnikov.
 */

type IfaceIcon = (p: { className?: string }) => JSX.Element;

interface Tile {
  href: string; title: string; sub: string; icon: IfaceIcon;
  /** Vloge, ki ploščico vidijo; '*' = vsi prijavljeni. */
  roles: string[] | '*';
  /** Široka ploščica čez obe koloni (Portal stranke na mockupu). */
  wide?: boolean;
}

const TILES: Tile[] = [
  {
    href: '/advisor', title: 'Delovni nalogi', sub: 'Pult — nalogi, stranke, računi',
    roles: ['advisor', 'admin', 'owner'],
    icon: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h6"/></svg>),
  },
  {
    href: '/advisor/vehicles', title: 'Vozila', sub: 'Seznam vozil in zgodovina',
    roles: ['advisor', 'admin', 'owner'],
    icon: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><rect x="2.5" y="9" width="19" height="8" rx="2.5"/><circle cx="7.5" cy="17.5" r="1.7"/><circle cx="16.5" cy="17.5" r="1.7"/><path d="M5.5 9l1.7-3.5h9.6L18.5 9"/></svg>),
  },
  {
    href: '/advisor/customers', title: 'Stranke', sub: 'Seznam strank',
    roles: ['advisor', 'admin', 'owner'],
    icon: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c.8-3.7 3.5-5.5 7-5.5s6.2 1.8 7 5.5"/></svg>),
  },
  {
    href: '/warehouse', title: 'Skladišče', sub: 'Zaloga in prevzemi',
    roles: ['warehouse', 'advisor', 'admin', 'owner'],
    icon: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/></svg>),
  },
  {
    href: '/mechanic', title: 'Mehanik', sub: 'Ure in postavke',
    roles: ['mechanic', 'admin', 'owner'],
    icon: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a4 4 0 0 1-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 1 5.4-5.4l-2.7 2.7-2.3-.4-.4-2.3 2.7-2.7Z"/></svg>),
  },
  {
    href: '/employee', title: 'Moj delovni čas', sub: 'Prihod, odhod, nalogi',
    roles: '*',
    icon: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>),
  },
  {
    href: '/owner', title: 'Analize', sub: 'Nadzorna plošča in poročila',
    roles: ['owner', 'admin'],
    icon: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18"/><rect x="7" y="10" width="3" height="7"/><rect x="12" y="6" width="3" height="11"/><rect x="17" y="13" width="3" height="4"/></svg>),
  },
  {
    href: '/portal', title: 'Portal stranke', sub: 'Vozila, nalogi, računi',
    roles: ['admin', 'owner'], wide: true,
    icon: (p) => (<svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11"/></svg>),
  },
];

function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 10) return 'Dobro jutro';
  if (h < 18) return 'Dober dan';
  return 'Dober večer';
}

type Hit = { type: string; id: string; label: string; sublabel?: string };

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
      <div className="relative mx-auto flex min-h-screen w-full max-w-3xl flex-col px-5 py-6 sm:py-10">
        {error && <div className="mx-auto mb-4 w-full max-w-md"><ProblemBanner message={error} /></div>}

        {!session ? (
          <>
            {/* Odjavljen pogled — logo plošča + prijava (nespremenjeno vedenje) */}
            <header className="relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-sidebar2 via-sidebar to-[#0a1626] px-8 py-12 text-center shadow-lift sm:py-14">
              <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-64 w-[40rem] -translate-x-1/2 rounded-full bg-brand/25 blur-[90px]" />
              <div className="relative flex flex-col items-center gap-4">
                <div className="rounded-2xl bg-white px-8 py-6 shadow-lift">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/asprint-logo.png" alt="A-SPRINT GARAGE" className="h-14 w-auto sm:h-[4.5rem]" />
                </div>
                <p className="text-[0.7rem] font-bold uppercase tracking-[0.3em] text-white/45">Operacijski sistem delavnice</p>
              </div>
            </header>
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
          </>
        ) : !session.tenantId ? (
          <div className="mx-auto mt-10 w-full max-w-md"><TenantPicker session={session} onPicked={setLocal} /></div>
        ) : (
          <SignedInHome session={session} tenantName={tenantName} onSwitch={() => { setSession({ ...session, tenantId: '' }); setLocal({ ...session, tenantId: '' }); }} onLogout={logout} />
        )}
      </div>
    </main>
  );
}

/* ------------------------------ prijavljeni dom ------------------------------ */

function SignedInHome({ session, tenantName, onSwitch, onLogout }: {
  session: Session; tenantName: string; onSwitch: () => void; onLogout: () => void;
}) {
  const router = useRouter();
  const roles = session.user.roles.map((r) => r.toLowerCase());
  const firstName = session.user.name.trim().split(/\s+/)[0] || session.user.name;
  const tiles = TILES.filter((t) => t.roles === '*' || t.roles.some((r) => roles.includes(r)));

  // Zvonec: število neprebranih (toleranten na odsoten endpoint — takrat 0).
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    let alive = true;
    api.notifications.list()
      .then((l) => { if (alive) setUnread(l.filter((n) => !n.read).length); })
      .catch(() => { /* obvestila so okras, ne pogoj */ });
    return () => { alive = false; };
  }, []);

  // Iskalnik z živimi zadetki — isti /search in isto usmerjanje kot advisorjeva
  // ukazna vrstica (work_order/customer/invoice/vehicle).
  const inputRef = useRef<HTMLInputElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [searching, setSearching] = useState(false);
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const query = q.trim();
    if (query.length < 2) { setHits([]); setSearching(false); return; }
    setSearching(true);
    timer.current = setTimeout(async () => {
      try {
        const r = await api.search(query);
        setHits(r.hits.slice(0, 8));
      } catch { setHits([]); }
      finally { setSearching(false); }
    }, 250);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [q]);

  function go(hit: Hit) {
    setQ(''); setHits([]);
    if (hit.type === 'work_order') router.push(`/advisor/work-orders/${hit.id}`);
    else if (hit.type === 'customer') router.push(`/advisor/customers/${hit.id}`);
    else if (hit.type === 'invoice') router.push(`/advisor/invoices/${hit.id}`);
    else if (hit.type === 'vehicle') router.push(`/advisor/vehicles/${hit.id}`);
  }

  return (
    <>
      {/* Logo + zvonec */}
      <div className="relative flex items-center justify-center py-1">
        <span className="rounded-xl bg-white px-4 py-2 shadow-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/asprint-logo.png" alt="A-SPRINT GARAGE" className="h-9 w-auto" />
        </span>
        <Link href="/advisor" aria-label="Obvestila" className="absolute right-0 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full text-ink transition hover:bg-surface">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 9a6 6 0 0 0-12 0c0 6-2 7-2 7h16s-2-1-2-7M10.3 20a2 2 0 0 0 3.4 0"/></svg>
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-stop px-1 text-[10px] font-bold text-white">{unread > 99 ? '99+' : unread}</span>
          )}
        </Link>
      </div>

      {/* Identiteta (z zamenjavo delavnice) */}
      <div className="mx-auto mt-4 flex w-full max-w-md items-center gap-3 rounded-full border border-line bg-surface px-4 py-2 shadow-card">
        <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-gradient-to-br from-brand to-brand700 text-sm font-bold text-white">
          {session.user.name.trim().charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-sm font-bold text-ink">{session.user.name} <span className="font-normal text-muted">· {tenantName}</span></span>
        </span>
        {session.memberships.length > 1 && (
          <button onClick={onSwitch} className="flex-none text-xs font-semibold text-brand hover:underline">zamenjaj</button>
        )}
      </div>

      {/* Iskalnik */}
      <div className="relative mt-5">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted2">
          {searching
            ? <Spinner className="!h-4 !w-4 text-brand" />
            : <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>}
        </span>
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Išči stranko, vozilo, nalog, račun..."
          className="h-12 w-full rounded-full border border-line bg-surface pl-11 pr-4 text-[15px] shadow-card transition focus:border-brandring focus:outline-none focus:ring-4 focus:ring-brandweak"
        />
        {hits.length > 0 && (
          <Card className="absolute inset-x-0 top-[3.4rem] z-30 overflow-hidden p-0">
            {hits.map((h) => (
              <button key={`${h.type}-${h.id}`} onClick={() => go(h)}
                className="flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left transition last:border-0 hover:bg-floor">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">{h.label}</span>
                  {h.sublabel && <span className="block truncate text-xs text-muted">{h.sublabel}</span>}
                </span>
                <svg viewBox="0 0 24 24" className="h-4 w-4 flex-none text-muted2" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
              </button>
            ))}
          </Card>
        )}
      </div>

      {/* AI kartica — fokusira iskalnik (isti /search z razpoznavo namena) */}
      <button
        onClick={() => inputRef.current?.focus()}
        className="mt-3 flex w-full items-center gap-3 rounded-card border border-brandring bg-gradient-to-br from-brandweak to-surface px-4 py-3.5 text-left shadow-card transition hover:shadow-lift"
      >
        <span className="flex-none text-[#7C3AED]">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor"><path d="M12 2l1.7 4.8L18 8.5l-4.3 1.7L12 15l-1.7-4.8L6 8.5l4.3-1.7zM19 13l.9 2.4 2.1.8-2.1.8L19 19.5l-.9-2.5-2.1-.8 2.1-.8zM5 14l.7 1.9 1.8.7-1.8.7L5 19.2l-.7-1.9-1.8-.7 1.8-.7z"/></svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-bold text-ink">Vprašaj inteligenco</span>
          <span className="block truncate text-xs text-muted">Postavi vprašanje o nalogih, strankah, računih...</span>
        </span>
        <svg viewBox="0 0 24 24" className="h-5 w-5 flex-none text-brand" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 6 6 6-6 6"/></svg>
      </button>

      {/* Pozdrav */}
      <div className="mt-7">
        <h1 className="text-[1.7rem] font-extrabold tracking-tight text-ink">{greeting()}, {firstName}</h1>
        <p className="mt-0.5 text-[15px] text-muted">Kaj bomo danes uredili?</p>
      </div>

      {/* Ploščice po vlogah */}
      <div className="stagger mt-5 grid grid-cols-2 gap-3 sm:gap-4">
        {tiles.map((t) => {
          const Ic = t.icon;
          return (
            <Link key={t.href} href={t.href}
              className={`group rounded-card border border-line bg-surface p-4 shadow-card transition hover:-translate-y-0.5 hover:border-brandring hover:shadow-lift sm:p-5 ${t.wide ? 'col-span-2 flex items-center gap-3' : ''}`}>
              <span className={`text-brand ${t.wide ? 'flex-none' : 'mb-3 block'}`}><Ic className="h-8 w-8" /></span>
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-[15px] font-bold text-ink sm:text-base">
                  {t.title}
                  {t.wide && <svg viewBox="0 0 24 24" className="h-4 w-4 text-brand" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 6 6 6-6 6"/></svg>}
                </span>
                <span className="mt-0.5 block truncate text-xs text-muted sm:text-sm">{t.sub}</span>
              </span>
            </Link>
          );
        })}
      </div>

      {/* Namesti kot aplikacijo (samo mobilno) */}
      <div className="mx-auto mt-6 flex w-full items-center gap-2.5 rounded-tool border border-brandring bg-brandweak px-4 py-3 text-sm text-ink md:hidden">
        <svg viewBox="0 0 24 24" className="h-5 w-5 flex-none text-brand" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M12 7v6M9.5 10.5 12 13l2.5-2.5"/></svg>
        <span>Namesti kot aplikacijo — v meniju brskalnika izberi <span className="font-semibold">»Dodaj na začetni zaslon«</span>.</span>
      </div>

      {/* Noga */}
      <footer className="mt-auto flex flex-col items-center gap-5 pt-10">
        <button onClick={onLogout} className="text-sm font-semibold text-muted hover:text-stop">Odjava</button>
        {DEMO_MODE && (
          <div className="w-full max-w-md opacity-90">
            <DemoShare />
          </div>
        )}
        <p className="num text-xs text-muted2">A-SPRINT Workshop OS · 2026</p>
      </footer>
    </>
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
