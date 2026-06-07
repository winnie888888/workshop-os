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

  const message = `Try the A-SPRINT Workshop OS demo — open this on your phone, no setup needed: ${url}`;
  const enc = encodeURIComponent(message);
  const encUrl = encodeURIComponent(url);

  const viber = `viber://forward?text=${enc}`;
  const whatsapp = `https://wa.me/?text=${enc}`;
  const email = `mailto:?subject=${encodeURIComponent('A-SPRINT Workshop OS demo')}&body=${enc}`;

  async function nativeShare() {
    try {
      await navigator.share({ title: 'A-SPRINT Workshop OS', text: 'Try the Workshop OS demo', url });
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
      <h2 className="mb-1 font-display text-lg font-bold">Share this demo</h2>
      <p className="mb-3 text-sm text-steel">Send the link in one tap — the person who receives it just opens it.</p>

      <div className="grid grid-cols-3 gap-2">
        <a href={viber} className="tool-tap flex flex-col items-center gap-1 rounded-tool border-2 border-line py-3 font-display font-bold">
          <span className="text-2xl">💜</span><span className="text-xs">Viber</span>
        </a>
        <a href={whatsapp} target="_blank" rel="noreferrer"
          className="tool-tap flex flex-col items-center gap-1 rounded-tool border-2 border-line py-3 font-display font-bold">
          <span className="text-2xl">🟢</span><span className="text-xs">WhatsApp</span>
        </a>
        <a href={email}
          className="tool-tap flex flex-col items-center gap-1 rounded-tool border-2 border-line py-3 font-display font-bold">
          <span className="text-2xl">✉️</span><span className="text-xs">Email</span>
        </a>
      </div>

      <div className="mt-2 flex gap-2">
        {canNativeShare && (
          <button onClick={nativeShare}
            className="tool-tap flex-1 rounded-tool bg-info py-2 font-display font-bold text-white">
            Share…
          </button>
        )}
        <button onClick={copy}
          className="tool-tap flex-1 rounded-tool border-2 border-line py-2 font-display font-bold">
          {copied ? 'Copied ✓' : 'Copy link'}
        </button>
      </div>

      {url && <p className="mt-2 break-all text-center text-xs text-steel">{url}</p>}
    </Card>
  );
}
