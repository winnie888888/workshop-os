'use client';

import { useEffect, useState } from 'react';
import { portalApi } from '@/lib/portal-api';
import { Card, Spinner } from '@/components/ui';

/* Dokumenti stranke — seznam dokumentov (računi, ponudbe, poročila …) prek
 * pravega /portal/documents. V demu vrne prazno -> prazno stanje. */
export default function PortalDocumentsPage() {
  const [docs, setDocs] = useState<any[] | null>(null);

  useEffect(() => { portalApi.documents().then((d) => setDocs(d as any[])).catch(() => setDocs([])); }, []);

  const fmt = (d: any) => {
    const raw = d.createdAt || d.issuedAt || d.date;
    return raw ? new Date(raw).toLocaleDateString('sl-SI') : '';
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Dokumenti</h1>
        <p className="text-sm text-muted">Vaši dokumenti — računi, ponudbe in poročila.</p>
      </div>

      <Card className="overflow-hidden">
        {docs === null ? <div className="p-6"><Spinner className="text-brand" /></div>
          : docs.length === 0 ? <p className="p-10 text-center text-muted">Trenutno ni dokumentov.</p>
          : (
            <ul className="divide-y divide-line">
              {docs.map((d, i) => {
                const url = d.url || d.downloadUrl || d.href;
                return (
                  <li key={d.id ?? i} className="flex items-center gap-3 px-5 py-3.5">
                    <span className="grid h-10 w-10 flex-none place-items-center rounded-tool bg-brandweak text-brand">
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-ink">{d.name || d.title || d.filename || 'Dokument'}</span>
                      <span className="num block text-xs text-muted2">{[d.type, fmt(d)].filter(Boolean).join(' · ')}</span>
                    </span>
                    {url && (
                      <a href={url} target="_blank" rel="noreferrer" className="flex-none rounded-tool border border-line px-3 py-1.5 text-sm font-semibold text-brand hover:border-brandring">Prenesi</a>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
      </Card>
    </div>
  );
}
