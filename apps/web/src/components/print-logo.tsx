/* eslint-disable @next/next/no-img-element */
'use client';

/*
 * Logotip na tiskanih dokumentih. Interim: datoteka /logo-asprint.jpg se
 * prikaže samo, kadar je naziv podjetja A-SPRINT (sidrni najemnik) — drugi
 * najemniki tujega loga ne smejo dobiti. Nalaganje lastnega logotipa po
 * najemniku pride z Nastavitvami (backlog, zabeleženo v checklistu).
 */
export function PrintLogo({ companyName }: { companyName?: string | null }) {
  const show = (companyName ?? '').toLowerCase().includes('sprint');
  if (!show) return null;
  return (
    <img
      src="/logo-asprint.jpg"
      alt=""
      className="mb-2 h-12 w-auto object-contain"
      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
    />
  );
}
