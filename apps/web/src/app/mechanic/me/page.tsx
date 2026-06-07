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
      <h1 className="px-1 pt-1 text-3xl font-extrabold tracking-tight">Profil</h1>

      <Card className="p-5">
        <p className="text-2xl font-bold">{session?.user.name ?? 'Ni prijave'}</p>
        <p className="mt-2 text-base">
          Ura teče: {active
            ? <span className="font-semibold text-hold">nalog v teku</span>
            : <span className="text-muted">ne</span>}
        </p>
        <p className="mt-1 text-base">
          Sinhronizacija: {!online
            ? <span className="font-semibold text-hold">{pending} shranjeno na napravi</span>
            : pending > 0
              ? <span className="font-semibold text-info">sinhronizacija {pending}…</span>
              : <span className="font-semibold text-go">vse sinhronizirano</span>}
        </p>
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 text-lg font-bold">Jezik {savingLang && <Spinner className="ml-2 text-info" />}</h2>
        <div className="grid grid-cols-2 gap-2">
          {LANGS.map((l) => (
            <button key={l.code} onClick={() => changeLanguage(l.code)}
              className={`min-h-tap rounded-tool border px-4 font-bold
                ${locale === l.code ? 'border-brand bg-brandweak text-brand' : 'border-linestrong bg-surface text-ink'}`}>
              {l.label}
            </button>
          ))}
        </div>
      </Card>

      {sessions && sessions.length > 0 && (
        <Card className="p-5">
          <h2 className="mb-3 text-lg font-bold">Prijavljene naprave</h2>
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

      <Button tone="stop" size="lg" full onClick={signOut}>Odjava</Button>
    </div>
  );
}

function shortAgent(ua?: string): string {
  if (!ua) return 'Ta naprava';
  if (/iphone|android|mobile/i.test(ua)) return 'Telefon';
  if (/ipad|tablet/i.test(ua)) return 'Tablica';
  return 'Računalnik';
}
