import Link from 'next/link';

/*
 * Marketinška lupina (Sprint 5) — skupna glava in noga za javne strani:
 * /predstavitev, /cenik, /pravno/*. Namenoma server komponenta brez stanja.
 * Ob go-live z domeno root '/' preusmerimo na /predstavitev (1 vrstica v
 * next.config redirects) — do takrat root ostaja vstop v aplikacijo.
 */

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface text-ink">
      <header className="border-b border-line bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4">
          <Link href="/predstavitev" className="text-lg font-extrabold tracking-tight">
            A-SPRINT <span className="text-brand">GARAGE</span>
          </Link>
          <nav className="flex items-center gap-5 text-sm font-semibold">
            <Link href="/predstavitev" className="text-muted hover:text-ink">Predstavitev</Link>
            <Link href="/cenik" className="text-muted hover:text-ink">Cenik</Link>
            <Link href="/" className="rounded-lg bg-ink px-3 py-1.5 text-white hover:opacity-90">Prijava</Link>
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <footer className="mt-16 border-t border-line">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-xs text-muted2">
          <div>© {new Date().getFullYear()} A-SPRINT GARAGE · AI Workshop OS za tovorne delavnice</div>
          <div className="flex gap-4">
            <Link href="/pravno/pogoji" className="hover:text-ink">Pogoji uporabe</Link>
            <Link href="/pravno/zasebnost" className="hover:text-ink">Zasebnost</Link>
            <Link href="/pravno/dpa" className="hover:text-ink">Pogodba o obdelavi (DPA)</Link>
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
