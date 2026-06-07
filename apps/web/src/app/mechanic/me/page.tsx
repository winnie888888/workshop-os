'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { getSession, setSession } from '@/lib/session';
import { anyActiveClock } from '@/lib/clock';
import { pendingCount, subscribeQueue } from '@/lib/offline-queue';
import { useOnlineStatus } from '@/lib/hooks';
import { api } from '@/lib/api';
import { Button, Card, Spinner } from '@/components/ui';

/*
 * The "Me" screen: who I am, whether I'm clocked on anywhere (the safety net
 * against a forgotten running clock), sync state, my language, my signed-in
 * devices, and sign out. Profile and sessions come from the real endpoints
 * (/me/profile, /auth/sessions); the language choice persists via PATCH so the
 * mechanic's locale follows them across devices.
 */
const LANGS: Array<{ code: string; label: string }> = [
  { code: 'sl', label: 'Slovenščina' },
  { code: 'hr', label: 'Hrvatski' },
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
];

export default function MechanicMe() {
  const router = useRouter();
  const session = getSession();
  const online = useOnlineStatus();
  const [pending, setPending] = useState(0);
  const [active, setActive] = useState<{ workOrderId: string; startedAt: string } | null>(null);
  const [locale, setLocale] = useState(session?.user.locale ?? 'sl');
  const [savingLang, setSavingLang] = useState(false);

  const { data: sessions } = useSWR('my-sessions', () => api.auth.sessions().catch(() => []));

  useEffect(() => {
    setPending(pendingCount());
    setActive(anyActiveClock());
    return subscribeQueue(() => setPending(pendingCount()));
  }, []);

  async function changeLanguage(code: string) {
    setLocale(code);
    setSavingLang(true);
    try {
      await api.me.updateProfile({ locale: code });
      const s = getSession();
      if (s) setSession({ ...s, user: { ...s.user, locale: code } });
    } catch { /* keep local choice; will retry on next change */ }
    finally { setSavingLang(false); }
  }

  async function signOut() {
    try { await api.auth.logout({ deviceId: localStorage.getItem('wos.deviceId') ?? undefined }); } catch { /* ignore */ }
    setSession(null);
    router.push('/');
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="px-1 pt-1 font-display text-3xl font-extrabold tracking-tight">Me</h1>

      <Card className="p-5">
        <p className="font-display text-2xl font-bold">{session?.user.name ?? 'Not signed in'}</p>
        <p className="mt-2 text-base">
          Clocked on: {active
            ? <span className="font-semibold text-hold">a job is running</span>
            : <span className="text-steel">none</span>}
        </p>
        <p className="mt-1 text-base">
          Sync: {!online
            ? <span className="font-semibold text-hold">{pending} saved on this device</span>
            : pending > 0
              ? <span className="font-semibold text-info">syncing {pending}…</span>
              : <span className="font-semibold text-go">all synced</span>}
        </p>
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 font-display text-lg font-bold">Language {savingLang && <Spinner className="ml-2 text-info" />}</h2>
        <div className="grid grid-cols-2 gap-2">
          {LANGS.map((l) => (
            <button key={l.code} onClick={() => changeLanguage(l.code)}
              className={`tool-tap rounded-tool border-2 px-4 font-display font-bold
                ${locale === l.code ? 'border-info bg-info/10 text-info' : 'border-line bg-panel'}`}>
              {l.label}
            </button>
          ))}
        </div>
      </Card>

      {sessions && sessions.length > 0 && (
        <Card className="p-5">
          <h2 className="mb-3 font-display text-lg font-bold">Signed-in devices</h2>
          <ul className="flex flex-col gap-2 text-sm">
            {sessions.map((s: any) => (
              <li key={s.id} className="flex items-center justify-between rounded-tool bg-floor px-3 py-2">
                <span className="truncate">{shortAgent(s.userAgent)}</span>
                <span className="text-steel">{new Date(s.lastSeenAt).toLocaleDateString('sl-SI')}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Button tone="stop" size="lg" full onClick={signOut}>Sign out</Button>
    </div>
  );
}

function shortAgent(ua?: string): string {
  if (!ua) return 'This device';
  if (/iphone|android|mobile/i.test(ua)) return 'Phone';
  if (/ipad|tablet/i.test(ua)) return 'Tablet';
  return 'Computer';
}
