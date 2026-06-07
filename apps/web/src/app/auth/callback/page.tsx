'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { handleCallback } from '@/lib/oidc';
import { api } from '@/lib/api';
import { setSession, getSession } from '@/lib/session';
import { Card, Spinner, ProblemBanner } from '@/components/ui';

/*
 * OIDC redirect target. The identity provider sends the browser back here with
 * a code; we exchange it for tokens, then immediately call /auth/me to learn
 * who the user is and which tenants they may act in. If they belong to exactly
 * one tenant we select it and go; otherwise the launcher shows the picker.
 */
export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const tokens = await handleCallback(params);

        // Seed a token-only session so the /auth/me call is authenticated.
        setSession({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt,
          tenantId: '',
          memberships: [],
          user: { id: '', name: '', mechanicId: '', roles: [] },
        });

        const me = await api.auth.me();
        const memberships = me.memberships;
        const firstTenant = memberships[0]?.tenantId ?? '';

        setSession({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt,
          tenantId: firstTenant,
          memberships,
          user: {
            id: me.user.id,
            name: me.user.name,
            mechanicId: me.user.id,
            roles: memberships[0]?.roles ?? [],
            locale: me.user.locale,
          },
        });

        // Record this device as an active session (best-effort).
        try {
          await api.auth.heartbeat({ deviceId: localStorage.getItem('wos.deviceId') ?? undefined, userAgent: navigator.userAgent });
        } catch { /* non-fatal */ }

        router.replace('/');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Login failed');
      }
    })();
  }, [router]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center justify-center p-6">
      <Card className="w-full p-8 text-center">
        {error ? (
          <>
            <ProblemBanner message={error} />
            <button onClick={() => router.replace('/')} className="mt-4 text-sm font-semibold text-info underline">
              Back to start
            </button>
          </>
        ) : (
          <>
            <Spinner className="text-info" />
            <p className="mt-4 font-display text-lg font-bold">Signing you in…</p>
          </>
        )}
      </Card>
    </main>
  );
}
