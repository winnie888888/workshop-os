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
 * pressing "Sign in" runs the Authorization Code + PKCE flow against the
 * configured identity provider. After the callback returns, the session holds
 * the user's identity and tenant memberships; if they belong to more than one
 * workshop the picker is shown, otherwise we go straight to the interfaces.
 */
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
    catch (e) { setError(e instanceof Error ? e.message : 'Could not start login'); setLoading(false); }
  }

  async function logout() {
    try { await api.auth.logout({ deviceId: localStorage.getItem('wos.deviceId') ?? undefined }); } catch { /* ignore */ }
    setSession(null); setLocal(null);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-6">
      <header className="pt-8">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="Workshop OS" className="h-12 w-12" />
          <div>
            <div className="font-display text-4xl font-extrabold tracking-tight text-info">A-SPRINT</div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-steel">Workshop Operating System</p>
          </div>
        </div>
      </header>

      {error && <ProblemBanner message={error} />}

      {!session ? (
        <Card className="p-6">
          <h2 className="mb-1 font-display text-xl font-bold">Sign in</h2>
          <p className="mb-4 text-sm text-steel">
            You&apos;ll be taken to your workshop&apos;s secure identity provider to sign in, then
            returned here. No password is ever handled by this app.
          </p>
          <Button tone="info" size="lg" full onClick={login} disabled={loading}>
            {loading ? <Spinner /> : 'Sign in with your workshop account'}
          </Button>
        </Card>
      ) : !session.tenantId ? (
        <TenantPicker session={session} onPicked={setLocal} />
      ) : (
        <>
          <Card className="bg-hazard p-5">
            <p className="text-sm text-steel">Signed in as</p>
            <p className="font-display text-2xl font-bold">{session.user.name}</p>
            <p className="text-sm text-steel">
              {session.memberships.find((m) => m.tenantId === session.tenantId)?.tenantName ?? 'Workshop'}
              {session.memberships.length > 1 && (
                <button onClick={() => { setSession({ ...session, tenantId: '' }); setLocal({ ...session, tenantId: '' }); }}
                  className="ml-2 text-info underline">switch</button>
              )}
            </p>
          </Card>

          <div className="grid gap-4">
            <Link href="/mechanic"><Button tone="go" size="xl" full>🔧 Mechanic — the bay</Button></Link>
            <Link href="/advisor"><Button tone="info" size="xl" full>🗂 Service Advisor — the desk</Button></Link>
            <Link href="/owner"><Button tone="neutral" size="xl" full>📊 Owner — the dashboard</Button></Link>
            <Link href="/employee"><Button tone="neutral" size="xl" full>⏱ My Work Time — clock & travel</Button></Link>
          </div>

          <button onClick={logout} className="mt-auto text-sm font-semibold text-stop underline">Sign out</button>

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
      <h2 className="mb-1 font-display text-xl font-bold">Choose workshop</h2>
      <p className="mb-4 text-sm text-steel">You have access to more than one workshop. Pick which one to work in.</p>
      <div className="grid gap-3">
        {session.memberships.map((m) => (
          <Button key={m.tenantId} tone="neutral" size="lg" full onClick={() => pick(m.tenantId)}>
            {m.tenantName}
          </Button>
        ))}
      </div>
    </Card>
  );
}

