import Link from 'next/link';
import { MarketingShell } from '@/components/marketing';

export const metadata = {
  title: 'A-SPRINT GARAGE — AI Workshop OS za tovorne delavnice',
  description:
    'Delovni nalogi, računi z UPN QR, skladišče, Minimax in AI pomočniki — vse v enem sistemu, zgrajenem v pravi slovenski tovorni delavnici.',
};

const FEATURES: Array<{ title: string; desc: string }> = [
  { title: 'Delovni nalogi brez papirja', desc: 'Mehanik dela s tablico: fotografije, glasovni vnos postavk, ure se merijo same. Pisarna vidi vse v živo.' },
  { title: 'Račun s QR plačilom', desc: 'UPN QR po uradnem ZBS standardu — stranka skenira z mobilno banko in plača v minuti. Avans na predračunu (ADVA) vključen.' },
  { title: 'Minimax in e-SLOG', desc: 'Izdani računi se samodejno sinhronizirajo v Minimax; e-SLOG / EN 16931 izvoz za javna naročila in večje kupce.' },
  { title: 'Skladišče, ki šteje samo', desc: 'Prevzemi s fotografijo dobavnice (OCR), inventura, samodejni predlogi naročil in povprečne nabavne cene.' },
  { title: 'AI pomočniki', desc: 'Glas → delovni nalog, prepoznava registrskih tablic, opozorila lastniku: marža, zamude, terjatve.' },
  { title: 'Flotne stranke in portal', desc: 'Prevozniška podjetja potrjujejo predračune in spremljajo vozila prek lastnega portala — brez telefonskih klicev.' },
];

export default function LandingPage() {
  return (
    <MarketingShell>
      {/* Hero */}
      <section className="mx-auto max-w-5xl px-5 pb-12 pt-16 text-center">
        <div className="mx-auto inline-block rounded-full border border-line bg-paper px-3 py-1 text-xs font-semibold text-muted">
          Zgrajeno v pravi tovorni delavnici — A-SPRINT d.o.o., Bela krajina
        </div>
        <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl">
          Vodenje tovorne delavnice, <span className="text-brand">ki teče samo</span>.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted">
          Od sprejema vozila do plačanega računa: delovni nalogi, skladišče, UPN QR plačila,
          Minimax in AI pomočniki v enem sistemu — brez papirja in brez prepisovanja.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link href="/signup" className="rounded-xl bg-brand px-6 py-3 text-base font-bold text-white shadow-sm hover:opacity-90">
            Preizkusi 14 dni brezplačno
          </Link>
          <Link href="/cenik" className="rounded-xl border border-line bg-white px-6 py-3 text-base font-bold text-ink hover:border-brand">
            Poglej cenik
          </Link>
        </div>
        <p className="mt-3 text-xs text-muted2">Brez kartice za preizkus · podatki in izvoz ostanejo vaši tudi po izteku</p>
      </section>

      {/* Funkcije */}
      <section className="mx-auto max-w-5xl px-5 py-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-line bg-white p-5">
              <div className="text-base font-bold text-ink">{f.title}</div>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Zaupanje */}
      <section className="mx-auto max-w-5xl px-5 py-10">
        <div className="rounded-2xl border border-line bg-paper p-6 sm:p-8">
          <h2 className="text-xl font-extrabold tracking-tight">Vaši podatki so vaši. Pika.</h2>
          <div className="mt-3 grid gap-4 text-sm text-muted sm:grid-cols-3">
            <p><span className="font-semibold text-ink">Ločenost najemnikov:</span> vsaka delavnica je strogo izolirana na ravni baze (RLS), vsak dostop revidiran.</p>
            <p><span className="font-semibold text-ink">Izvoz kadar koli:</span> celoten posnetek podatkov (GDPR) na en klik — tudi če naročnino prekinete.</p>
            <p><span className="font-semibold text-ink">Zasnovano za EU:</span> gostovanje in AI obdelava sta načrtovana znotraj EU; pogodba o obdelavi (DPA) na voljo.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-5 py-12 text-center">
        <h2 className="text-2xl font-extrabold tracking-tight">Pripravljeni opustiti papir?</h2>
        <p className="mx-auto mt-2 max-w-xl text-muted">Registracija traja dve minuti. Prvi delovni nalog lahko odprete še danes.</p>
        <Link href="/signup" className="mt-5 inline-block rounded-xl bg-ink px-6 py-3 text-base font-bold text-white hover:opacity-90">
          Začni brezplačni preizkus →
        </Link>
      </section>
    </MarketingShell>
  );
}
