import Link from 'next/link';

/*
 * Marketinška lupina (Sprint 5) — skupna glava in noga za javne strani:
 * /predstavitev, /cenik, /pravno/*. Namenoma server komponenta brez stanja.
 * Ob go-live z domeno root '/' preusmerimo na /predstavitev (1 vrstica v
 * next.config redirects) — do takrat root ostaja vstop v aplikacijo.
 *
 * Redesign: navy glava/noga po novi landing predlogi (mockup), da so
 * /cenik in /pravno vizualno usklajeni z /predstavitev. Demo gumb kaže na
 * demo okolje (demo način živi na ravni deploya, ne kot ruta).
 */

const DEMO_URL = 'https://workshop-os-delta.vercel.app';

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface text-ink">
      <header className="sticky top-0 z-40 bg-[#0A1F3D] text-white shadow-[0_2px_14px_rgba(4,14,30,.35)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3.5">
          <Link href="/predstavitev" className="flex shrink-0 items-center" aria-label="A-SPRINT Garage — predstavitev">
            <span className="flex items-center rounded-[8px] bg-white px-2 py-1 shadow-[0_3px_10px_rgba(0,0,0,.3)] sm:rounded-[10px] sm:px-2.5 sm:py-[5px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/asprint-logo.png" alt="A-SPRINT GARAGE" className="block h-6 w-auto sm:h-[30px]" />
            </span>
          </Link>
          <nav className="flex items-center gap-3 text-sm font-semibold sm:gap-5">
            <Link href="/predstavitev" className="hidden text-[#D7E2F2] hover:text-white sm:block">Predstavitev</Link>
            <Link href="/cenik" className="text-[#D7E2F2] hover:text-white">Cenik</Link>
            <Link href="/" className="whitespace-nowrap rounded-lg border border-white/45 px-2.5 py-1.5 text-[12px] text-white hover:bg-white/10 sm:px-3 sm:text-sm">Prijava</Link>
            <Link href={DEMO_URL} className="whitespace-nowrap rounded-lg bg-[#1A6BEF] px-2.5 py-1.5 text-[12px] text-white hover:bg-[#1257C9] sm:px-3 sm:text-sm">Demo</Link>
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <footer className="mt-16 bg-[#0A1F3D] text-[#C9D7EA]">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-xs">
          <div>© {new Date().getFullYear()} A-SPRINT GARAGE · AI Workshop OS za tovorne delavnice</div>
          <div className="flex gap-4">
            <Link href="/pravno/pogoji" className="hover:text-white">Pogoji uporabe</Link>
            <Link href="/pravno/zasebnost" className="hover:text-white">Zasebnost</Link>
            <Link href="/pravno/dpa" className="hover:text-white">Pogodba o obdelavi (DPA)</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <MarketingShell>
      <article className="mx-auto max-w-3xl px-5 py-10">
        <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted2">Zadnja posodobitev: {updated}</p>
        <div className="mt-3 rounded-lg border border-hold/30 bg-hold/10 px-3 py-2 text-sm font-semibold text-hold">
          Osnutek — pred produkcijsko uporabo potreben pregled pravnega svetovalca.
        </div>
        <div className="prose-sm mt-6 space-y-4 text-[15px] leading-relaxed text-ink [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-bold [&_ul]:list-disc [&_ul]:pl-5">
          {children}
        </div>
      </article>
    </MarketingShell>
  );
}
