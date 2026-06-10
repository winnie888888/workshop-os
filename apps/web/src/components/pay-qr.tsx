'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { DEMO_MODE } from '@/lib/demo';
import { formatMoneyMinor } from '@/lib/format';
import { Card, Spinner } from '@/components/ui';
import { buildUpnQr, buildEpcQr, upnQrSvg, epcQrSvg, upnDate } from '@/lib/qr/upn';

/*
 * Plačilo s QR — UPN QR (slovenske mobilne banke) + SEPA/EPC QR (tuje banke,
 * Revolut, N26). Prejemnikove podatke (IBAN, naziv, naslov) bere iz profila
 * delavnice (/tenant/profile); brez vpisanega IBAN-a pošteno pove, kaj manjka,
 * namesto da bi izrisal neuporaben QR. V demo načinu uporabi VZOREC z IBAN-om
 * iz uradnega ZBS standarda in to jasno označi.
 */

const DEMO_RECIPIENT = {
  name: 'A-SPRINT d.o.o. (vzorec)',
  iban: 'SI56051008010486080', // vzorčni IBAN iz uradnega ZBS standarda
  address: 'Testna cesta 1',
  postCode: '8340',
  city: 'Črnomelj',
};

export interface PayQrProps {
  /** Znesek za plačilo v centih (npr. preostanek računa). */
  amountMinor: number;
  /** Namen plačila (polje 13), npr. "Račun 2026-00012". */
  purpose: string;
  /** Referenca prejemnika — model+sklic skupaj (npr. iz rfReference()). */
  reference: string;
  /** Rok plačila — ISO 'YYYY-MM-DD' ali null. */
  deadline?: string | null;
  /** Plačnik (stranka) — neobvezno; banka ga ob skenu lahko prepiše. */
  payer?: { name?: string | null; street?: string | null; city?: string | null } | null;
  /** Koda namena: GDSV (privzeto, blago/storitve) ali ADVA (avans) … */
  purposeCode?: string;
  heading?: string;
}

function groupIban(iban: string): string {
  return iban.replace(/(.{4})/g, '$1 ').trim();
}

export default function PayQr(props: PayQrProps) {
  const real = !DEMO_MODE;
  const { data: profile, isLoading } = useSWR(
    real ? 'tenant-profile' : null,
    () => api.tenant.profile(),
  );

  if (real && isLoading) {
    return (
      <Card className="flex items-center gap-3 p-5 text-muted">
        <Spinner className="text-brand" /> Nalagam podatke za plačilo …
      </Card>
    );
  }

  const recipient = DEMO_MODE
    ? DEMO_RECIPIENT
    : profile && profile.iban
      ? { name: profile.name, iban: profile.iban, address: profile.address ?? '', postCode: profile.postCode ?? '', city: profile.city ?? '' }
      : null;

  if (!recipient) {
    return (
      <Card className="p-5">
        <div className="text-sm font-bold text-ink">{props.heading ?? 'Plačilo s QR kodo'}</div>
        <p className="mt-2 text-sm text-muted">
          Za izris UPN QR kode delavnica še nima vpisanega IBAN-a. Lastnik ali
          administrator ga vpiše v{' '}
          <Link href="/advisor/settings" className="font-semibold text-brand hover:underline">Nastavitve → Podatki za plačila</Link>.
        </p>
      </Card>
    );
  }

  return <PayQrInner {...props} recipient={recipient} />;
}

function PayQrInner({ amountMinor, purpose, reference, deadline, payer, purposeCode, heading, recipient }:
  PayQrProps & { recipient: { name: string; iban: string; address: string; postCode: string; city: string } }) {

  const [tab, setTab] = useState<'upn' | 'sepa'>('upn');
  const [copied, setCopied] = useState<string | null>(null);

  const built = useMemo(() => {
    try {
      const upn = buildUpnQr({
        recipient: {
          iban: recipient.iban,
          name: recipient.name,
          street: recipient.address,
          city: [recipient.postCode, recipient.city].filter(Boolean).join(' '),
        },
        amountMinor,
        purpose,
        purposeCode,
        reference,
        deadline: deadline ?? null,
        payer: payer ?? null,
      });
      const epc = buildEpcQr({ name: recipient.name, iban: recipient.iban, amountMinor, reference });
      return { upnSvg: upnQrSvg(upn.payload), epcSvg: epcQrSvg(epc), error: null as string | null };
    } catch (e: any) {
      return { upnSvg: '', epcSvg: '', error: e?.message ?? 'QR kode ni mogoče zgraditi.' };
    }
  }, [recipient, amountMinor, purpose, purposeCode, reference, deadline, payer]);

  async function copy(key: string, value: string) {
    try { await navigator.clipboard.writeText(value); setCopied(key); setTimeout(() => setCopied(null), 1800); }
    catch { /* clipboard ni na voljo (http) — vrednost je vidna za ročni prepis */ }
  }

  if (built.error) {
    return (
      <Card className="p-5">
        <div className="text-sm font-bold text-ink">{heading ?? 'Plačilo s QR kodo'}</div>
        <p className="mt-2 text-sm text-stop">{built.error}</p>
      </Card>
    );
  }

  const rows: Array<{ key: string; label: string; value: string; copyValue?: string }> = [
    { key: 'iban', label: 'IBAN', value: groupIban(recipient.iban), copyValue: recipient.iban },
    { key: 'ref', label: 'Sklic', value: reference },
    { key: 'amt', label: 'Znesek', value: formatMoneyMinor(String(amountMinor)), copyValue: (amountMinor / 100).toFixed(2) },
  ];
  if (deadline) rows.push({ key: 'due', label: 'Rok', value: upnDate(deadline) });

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-bold text-ink">{heading ?? 'Plačilo s QR kodo'}</div>
        <div className="flex gap-1 rounded-lg bg-paper p-0.5 text-xs font-semibold">
          <button onClick={() => setTab('upn')}
            className={`rounded-md px-2.5 py-1 ${tab === 'upn' ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'}`}>
            UPN (SI banke)
          </button>
          <button onClick={() => setTab('sepa')}
            className={`rounded-md px-2.5 py-1 ${tab === 'sepa' ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'}`}>
            SEPA (tuje/Revolut)
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-start gap-5">
        <div
          className="w-44 shrink-0 rounded-lg border border-line bg-white p-1"
          dangerouslySetInnerHTML={{ __html: tab === 'upn' ? built.upnSvg : built.epcSvg }}
        />
        <div className="min-w-[14rem] flex-1">
          <div className="text-xs text-muted">
            {tab === 'upn'
              ? 'Stranka odpre svojo mobilno banko in skenira kodo — nalog se izpolni sam.'
              : 'Za plačnike s tujo banko ali Revolut/N26 (SEPA »Scan to Pay«).'}
          </div>
          <dl className="mt-2 divide-y divide-line text-sm">
            {rows.map((r) => (
              <div key={r.key} className="flex items-center justify-between gap-3 py-1.5">
                <dt className="text-muted">{r.label}</dt>
                <dd className="num flex items-center gap-2 font-semibold text-ink">
                  <span>{r.value}</span>
                  {r.copyValue !== undefined || r.key === 'ref' ? (
                    <button
                      onClick={() => copy(r.key, r.copyValue ?? r.value)}
                      className="rounded border border-line px-1.5 py-0.5 text-[11px] font-semibold text-muted hover:border-brand hover:text-brand"
                      title="Kopiraj"
                    >
                      {copied === r.key ? '✓' : 'Kopiraj'}
                    </button>
                  ) : null}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-2 text-xs text-muted2">Namen: {purpose}</div>
          {DEMO_MODE && (
            <div className="mt-2 rounded-md bg-hold/10 px-2 py-1 text-xs font-semibold text-hold">
              Demo: vzorčni IBAN iz ZBS standarda — pravi pride iz Nastavitev delavnice.
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
