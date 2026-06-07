'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui';

/*
 * One-click demo sharing. The whole point of the demo package is that a person
 * receives a link in Viber (or WhatsApp, or email), taps it, and is inside the
 * product on their phone with no setup. This component closes the loop from the
 * other side: it lets whoever is presenting hand the link to the next person in
 * a single tap, on the channels A-SPRINT's audience actually uses.
 *
 * It reads the live URL at runtime (window.location), so it always shares
 * whatever address the demo is deployed at — no hardcoded link to keep in sync.
 * Each target is a plain platform deep-link/scheme, so there is no dependency and
 * nothing to install:
 *   - Viber:    viber://forward?text=...
 *   - WhatsApp: https://wa.me/?text=...
 *   - Email:    mailto:?subject=...&body=...
 * Plus a copy-link button and, where the device supports it, the native share
 * sheet (navigator.share) which fans out to every installed app at once.
 */
export function DemoShare() {
  const [url, setUrl] = useState('');
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Client-only: the public URL is whatever the demo is being viewed at.
    setUrl(window.location.origin);
    setCanNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
  }, []);

  const message = `Preizkusi prikaz A-SPRINT Workshop OS — odpri na telefonu, brez namestitve: ${url}`;
  const enc = encodeURIComponent(message);
  const encUrl = encodeURIComponent(url);

  const viber = `viber://forward?text=${enc}`;
  const whatsapp = `https://wa.me/?text=${enc}`;
  const email = `mailto:?subject=${encodeURIComponent('Prikaz A-SPRINT Workshop OS')}&body=${enc}`;

  async function nativeShare() {
    try {
      await navigator.share({ title: 'A-SPRINT Workshop OS', text: 'Preizkusi prikaz Workshop OS', url });
    } catch { /* user dismissed — no-op */ }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard blocked — the link is visible below to copy by hand */ }
  }

  return (
    <Card className="p-4">
      <h2 className="mb-1 text-lg font-bold text-ink">Deli ta prikaz</h2>
      <p className="mb-3 text-sm text-muted">Pošlji povezavo v enem dotiku — prejemnik jo samo odpre.</p>

      <div className="grid grid-cols-3 gap-2">
        <a href={viber} className="flex flex-col items-center gap-1.5 rounded-tool border border-line py-3 font-bold text-ink transition hover:border-brandring hover:bg-floor">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#7360f2' }} /><span className="text-xs">Viber</span>
        </a>
        <a href={whatsapp} target="_blank" rel="noreferrer"
          className="flex flex-col items-center gap-1.5 rounded-tool border border-line py-3 font-bold text-ink transition hover:border-brandring hover:bg-floor">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#25d366' }} /><span className="text-xs">WhatsApp</span>
        </a>
        <a href={email}
          className="flex flex-col items-center gap-1.5 rounded-tool border border-line py-3 font-bold text-ink transition hover:border-brandring hover:bg-floor">
          <span className="h-2.5 w-2.5 rounded-full bg-brand" /><span className="text-xs">E-pošta</span>
        </a>
      </div>

      <div className="mt-2 flex gap-2">
        {canNativeShare && (
          <button onClick={nativeShare}
            className="min-h-tap flex-1 rounded-tool bg-brand py-2 font-bold text-white transition hover:bg-brand600">
            Deli…
          </button>
        )}
        <button onClick={copy}
          className="min-h-tap flex-1 rounded-tool border border-linestrong py-2 font-bold text-ink transition hover:bg-floor">
          {copied ? 'Kopirano ✓' : 'Kopiraj povezavo'}
        </button>
      </div>

      {url && <p className="mt-2 break-all text-center text-xs text-muted2">{url}</p>}
    </Card>
  );
}
