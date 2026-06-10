import Link from 'next/link';
import { MarketingShell } from '@/components/marketing';
import { PLANS } from '@/lib/billing-plans';

export const metadata = {
  title: 'Cenik — A-SPRINT GARAGE',
  description: 'Preprosti mesečni paketi za tovorne delavnice. 14 dni brezplačnega preizkusa, brez kartice.',
};

const FAQ: Array<{ q: string; a: string }> = [
  { q: 'Ali za preizkus potrebujem kartico?', a: 'Ne. 14-dnevni preizkus se začne takoj po registraciji, paket izberete šele, ko ste prepričani.' },
  { q: 'Kaj se zgodi po izteku preizkusa?', a: 'Urejanje se zamrzne, vsi podatki, branje in izvoz pa ostanejo dostopni. Nič se ne izbriše.' },
  { q: 'Lahko paket zamenjam ali prekinem?', a: 'Kadar koli — naročnino upravljate sami prek varnega Stripe portala. Ob prekinitvi podatki ostanejo vaši.' },
  { q: 'So cene z DDV?', a: 'Cene so brez DDV; DDV se obračuna na računu. Za vsako plačilo prejmete slovenski račun.' },
];

export default function PricingPage() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-5xl px-5 pb-6 pt-14 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight">Preprost cenik, brez drobnega tiska</h1>
        <p className="mx-auto mt-3 max-w-xl text-muted">
          Vsi paketi vključujejo 14 dni brezplačnega preizkusa. Podatki in izvoz so vedno vaši.
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {PLANS.map((p) => (
            <div key={p.id} className={`flex flex-col rounded-2xl border bg-white p-6 ${p.highlight ? 'border-brand ring-2 ring-brand/30' : 'border-line'}`}>
              {p.highlight && <div className="mb-2 self-start rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-brand">Najbolj izbrano</div>}
              <div className="text-lg font-extrabold">{p.label}</div>
              <div className="mt-1 text-3xl font-extrabold">{p.priceEur} €<span className="text-sm font-semibold text-muted"> /mes + DDV</span></div>
              <p className="mt-1 text-sm text-muted">{p.tagline}</p>
              <ul className="mt-4 flex-1 space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2"><span className="text-go">✓</span><span>{f}</span></li>
                ))}
              </ul>
              <Link
                href="/signup"
                className={`mt-5 rounded-xl px-4 py-2.5 text-center text-sm font-bold ${p.highlight ? 'bg-brand text-white hover:opacity-90' : 'border border-line text-ink hover:border-brand'}`}
              >
                Začni preizkus
              </Link>
            </div>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-muted2">
          Večja flota, več lokacij ali posebne zahteve? Pišite nam — pripravimo ponudbo po meri.
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-10">
        <h2 className="text-xl font-extrabold tracking-tight">Pogosta vprašanja</h2>
        <div className="mt-4 space-y-4">
          {FAQ.map((f) => (
            <div key={f.q} className="rounded-xl border border-line bg-white p-4">
              <div className="text-sm font-bold text-ink">{f.q}</div>
              <p className="mt-1 text-sm text-muted">{f.a}</p>
            </div>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}
