'use client';

/**
 * /signup — registracija nove delavnice (Faza A). Pošlje POST /public/signup;
 * strežnik VEDNO odgovori {ok} (enumeration zaščita), zato je edino pošteno
 * uspešno stanje "preverite e-pošto". V javnem demu (Vercel) backend ne
 * obstaja, zato stran to pove naravnost, namesto da bi se pretvarjala.
 */

import { useState } from 'react';
import Link from 'next/link';
import { Button, Card, Spinner, ProblemBanner } from '@/components/ui';
import { DEMO_MODE } from '@/lib/demo';
import { signupLocal } from '@/lib/local-auth';

const inputCls =
  'h-11 w-full rounded-tool border border-line bg-surface2 px-3 text-sm transition focus:border-brandring focus:bg-surface focus:outline-none focus:ring-4 focus:ring-brandweak';
const labelCls = 'mb-1 block text-xs font-bold uppercase tracking-wide text-muted2';

export default function SignupPage() {
  const [workshopName, setWorkshopName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit() {
    const name = workshopName.trim();
    if (name.length < 2) { setError('Vpišite ime delavnice.'); return; }
    if (!email.trim()) { setError('Vpišite e-naslov.'); return; }
    if (password.length < 10) { setError('Geslo mora imeti vsaj 10 znakov.'); return; }
    setBusy(true); setError(null);
    try {
      await signupLocal(email, password, name);
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registracija ni uspela.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-floor">
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-[-14rem] h-[34rem] w-[70rem] -translate-x-1/2 rounded-full bg-brand/10 blur-[130px]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-10">
        <div className="mb-6 text-center">
          <div className="mx-auto inline-block rounded-2xl bg-white px-6 py-4 shadow-lift">
            <img src="/asprint-logo.png" alt="A-SPRINT GARAGE" className="h-10 w-auto" />
          </div>
        </div>

        {DEMO_MODE ? (
          <Card className="p-7">
            <h1 className="mb-1 text-xl font-bold text-ink">Registracija</h1>
            <p className="mb-5 text-sm text-muted">
              To je javni demo brez strežnika — registracija novih delavnic je na voljo v
              produkcijski različici. Demo lahko raziskujete brez prijave.
            </p>
            <Link href="/" className="block">
              <Button tone="info" size="lg" full>Nazaj na vstop</Button>
            </Link>
          </Card>
        ) : sent ? (
          <Card className="p-7">
            <h1 className="mb-1 text-xl font-bold text-ink">Preverite e-pošto</h1>
            <p className="mb-3 text-sm text-muted">
              Če e-naslov še ni registriran, smo nanj poslali potrditveno povezavo (velja 24 ur).
              S klikom nanjo se delavnica ustvari in ste takoj prijavljeni.
            </p>
            <p className="mb-5 text-xs text-muted2">
              Razvojno okolje: če e-poštni ponudnik še ni nastavljen (RESEND_API_KEY), je
              povezava izpisana v dnevniku API strežnika.
            </p>
            <Link href="/" className="text-sm font-semibold text-brand hover:underline">Na prijavo</Link>
          </Card>
        ) : (
          <Card className="p-7">
            <h1 className="mb-1 text-xl font-bold text-ink">Ustvarite račun delavnice</h1>
            <p className="mb-5 text-sm text-muted">14-dnevni preizkus, brez kreditne kartice.</p>
            {error && <div className="mb-4"><ProblemBanner message={error} /></div>}
            <div className="flex flex-col gap-3">
              <label className="block">
                <span className={labelCls}>Ime delavnice</span>
                <input value={workshopName} onChange={(e) => setWorkshopName(e.target.value)}
                  placeholder="npr. Servis Kovač d.o.o." className={inputCls} />
              </label>
              <label className="block">
                <span className={labelCls}>E-naslov</span>
                <input type="email" autoComplete="email" value={email}
                  onChange={(e) => setEmail(e.target.value)} className={inputCls} />
              </label>
              <label className="block">
                <span className={labelCls}>Geslo (vsaj 10 znakov)</span>
                <input type="password" autoComplete="new-password" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') void submit(); }} className={inputCls} />
              </label>
              <Button tone="info" size="lg" full onClick={submit} disabled={busy}>
                {busy ? <Spinner /> : 'Ustvari račun'}
              </Button>
            </div>
            <p className="mt-5 text-center text-sm text-muted">
              Že imate račun?{' '}
              <Link href="/" className="font-semibold text-brand hover:underline">Prijava</Link>
            </p>
          </Card>
        )}
      </div>
    </main>
  );
}
