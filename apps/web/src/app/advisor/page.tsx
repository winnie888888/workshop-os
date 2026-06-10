'use client';

import Link from 'next/link';
import { useState } from 'react';
import useSWR from 'swr';
import { api, type WorkOrderListItem } from '@/lib/api';
import { displayPlate, formatMoneyMinor, statusLabel, statusTone } from '@/lib/format';
import { Card, SoftChip, Spinner } from '@/components/ui';

/*
 * The advisor's dashboard ("Nadzorna plošča") — the daily landing, redesigned to
 * the A-SPRINT spec: KPI stat cards, today's schedule as a timeline, recent work
 * orders, quick actions, derived alerts, an honest receivables panel, and recent
 * activity. Every number is derived from real/demo endpoints (open work orders,
 * recent work orders, AR aging, appointments, activity) — nothing is invented.
 */
const OPEN_STATUSES = ['open', 'in_progress', 'awaiting_approval', 'awaiting_parts', 'on_hold', 'ready'];

function Ico({ d, className = 'h-5 w-5' }: { d: React.ReactNode; className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">{d}</svg>;
}

export default function AdvisorDashboard() {
  const { data: open, isLoading } = useSWR(
    'advisor-open',
    () => api.workOrders.list({ statuses: OPEN_STATUSES, limit: 200 }),
    { refreshInterval: 15000 },
  );
  const { data: recent } = useSWR('advisor-recent', () => api.workOrders.list({ limit: 8 }));
  const { data: aging } = useSWR('advisor-aging', () => api.reports.arAging().catch(() => null));
  const { data: appts } = useSWR('advisor-appts', () => api.appointments.list().catch(() => []));

  const jobs = open ?? [];
  const inProgress = jobs.filter((w) => w.hasOpenClock || w.status === 'in_progress').length;
  const ready = jobs.filter((w) => w.status === 'ready').length;

  // AR total: in demo `formatted` is empty, so format from buckets.total ourselves.
  const arTotalMinor: string | null = aging?.buckets?.total ?? null;
  const arTotal = arTotalMinor != null ? formatMoneyMinor(arTotalMinor, 'EUR') : '—';

  // Optional time-of-day for a job, taken from today's appointments (if any).
  const todayKey = new Date().toISOString().slice(0, 10);
  const timeByWo: Record<string, string> = {};
  for (const a of (appts ?? []) as Array<{ workOrderId?: string; start?: string }>) {
    if (a.workOrderId && typeof a.start === 'string' && a.start.slice(0, 10) === todayKey) timeByWo[a.workOrderId] = hhmm(a.start);
  }

  const today = capitalize(new Date().toLocaleDateString('sl-SI', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Nadzorna plošča</h1>
        <span className="flex items-center gap-2 text-sm text-muted">
          <Ico className="h-4 w-4" d={<><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>} />
          {today}
        </span>
      </div>

      <OnboardingCard />

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Današnji urnik" value={String(jobs.length)} unit="nalogi" href="/advisor/work-orders"
          chip="bg-brandweak text-brand" icon={<><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>} />
        <StatCard label="V delu" value={String(inProgress)} unit="nalog" href="/advisor/work-orders"
          chip="bg-[#fbecd2] text-hold" icon={<><path d="M5 22h14M5 2h14M6 2v5a6 6 0 0 0 12 0V2M6 22v-5a6 6 0 0 1 12 0v5"/></>} />
        <StatCard label="Pripravljeno" value={String(ready)} unit="nalog" href="/advisor/work-orders"
          chip="bg-[#e3f4ea] text-go" icon={<><path d="M22 11.1V12a10 10 0 1 1-5.9-9.1"/><path d="M22 4 12 14.01l-3-3"/></>} />
        <StatCard label="Odprta vrednost" value={arTotal} unit="EUR" href="/advisor/invoices" linkLabel="Podrobnosti" valueClass="text-2xl"
          chip="bg-[#efeafe] text-[#6d4fd6]" icon={<><rect x="2" y="6" width="20" height="13" rx="2"/><path d="M16 13h.01M2 10h20"/></>} />
      </div>

      {isLoading && <div className="flex justify-center py-10"><Spinner className="text-brand" /></div>}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left: timeline + recent table */}
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
          <Card className="overflow-hidden">
            <SectionHead title="Današnji urnik" href="/advisor/work-orders" />
            <div className="px-2 py-2">
              {jobs.length === 0 && !isLoading && <p className="px-4 py-8 text-center text-muted">Danes ni odprtih nalogov.</p>}
              <ol className="flex flex-col">
                {jobs.slice(0, 6).map((w, i, arr) => (
                  <li key={w.id}>
                    <Link href={`/advisor/work-orders/${w.id}`} className="group flex items-center gap-3 rounded-tool px-2 py-3 transition hover:bg-floor">
                      <span className="num w-11 flex-none text-sm font-semibold text-muted2">{timeByWo[w.id] ?? ''}</span>
                      <span className="relative flex w-3 flex-none justify-center self-stretch">
                        {i > 0 && <span className="absolute bottom-1/2 left-1/2 top-0 w-px -translate-x-1/2 bg-line" />}
                        {i < arr.length - 1 && <span className="absolute bottom-0 left-1/2 top-1/2 w-px -translate-x-1/2 bg-line" />}
                        <span className={`relative z-10 mt-2 h-3 w-3 rounded-full ring-4 ring-surface ${dotClass(w)}`} />
                      </span>
                      <span className="num flex-none font-bold text-brand sm:w-24">{w.number ?? '—'}</span>
                      <span className="num flex-none font-bold text-ink sm:w-28">{w.plate ? displayPlate(w.plate) : '—'}</span>
                      <span className="hidden min-w-0 flex-1 truncate text-sm text-muted md:block">{w.customerName ?? ''}</span>
                      <SoftChip tone={w.hasOpenClock ? 'go' : statusTone(w.status)}>{w.hasOpenClock ? 'V delu' : statusLabel(w.status)}</SoftChip>
                      <Ico className="h-4 w-4 flex-none text-muted2 transition group-hover:translate-x-0.5 group-hover:text-muted" d={<path d="m9 18 6-6-6-6" />} />
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <SectionHead title="Zadnji delovni nalogi" href="/advisor/work-orders" />
            <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-sm">
              <thead className="bg-surface2 text-left text-xs uppercase tracking-wide text-muted2">
                <tr>
                  <th className="px-4 py-2 font-bold">Št. naloga</th>
                  <th className="px-4 py-2 font-bold">Vozilo</th>
                  <th className="hidden px-4 py-2 font-bold sm:table-cell">Stranka</th>
                  <th className="px-4 py-2 font-bold">Status</th>
                  <th className="px-4 py-2 text-right font-bold">Znesek</th>
                  <th className="w-10 px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {(recent ?? []).map((w) => (
                  <tr key={w.id} className="border-t border-line hover:bg-floor">
                    <td className="px-4 py-2.5"><Link href={`/advisor/work-orders/${w.id}`} className="num font-semibold text-brand hover:underline">{w.number ?? '—'}</Link></td>
                    <td className="num px-4 py-2.5 text-muted">{w.plate ? displayPlate(w.plate) : '—'}</td>
                    <td className="hidden truncate px-4 py-2.5 text-muted sm:table-cell">{w.customerName ?? ''}</td>
                    <td className="px-4 py-2.5"><SoftChip tone={statusTone(w.status)}>{statusLabel(w.status)}</SoftChip></td>
                    <td className="num px-4 py-2.5 text-right font-semibold text-ink">{formatMoneyMinor(w.totalGrossMinor, w.currency)}</td>
                    <td className="px-2 py-2.5 text-right"><RowMenu w={w} /></td>
                  </tr>
                ))}
                {(recent ?? []).length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted">Ni nalogov.</td></tr>}
              </tbody>
            </table>
            </div>
          </Card>
        </div>

        {/* Right: quick access, alerts, finance, activity */}
        <div className="flex min-w-0 flex-col gap-4">
          <Card className="p-4">
            <h2 className="mb-3 text-base font-bold text-ink">Hitri dostop</h2>
            <div className="grid grid-cols-2 gap-3">
              <QuickTile href="/advisor/work-orders/new" label="Nov nalog" icon={<path d="M12 5v14M5 12h14" />} />
              <QuickTile href="/advisor/customers/new" label="Nova stranka" icon={<><circle cx="9" cy="7" r="4" /><path d="M3 21v-1a5 5 0 0 1 5-5h2M19 8v6M16 11h6" /></>} />
              <QuickTile href="/advisor/plate-scan" label="Skeniraj tablico" icon={<><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M7 10v4M11 10v4M15 10v4" /></>} />
              <QuickTile href="/advisor/voice" label="Glasovni vnos" icon={<><path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" /><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4" /></>} />
            </div>
          </Card>

          <Card className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-base font-bold text-ink">Opozorila</h2>
              <Link href="/advisor/work-orders" className="text-xs font-bold uppercase tracking-wide text-brand hover:underline">Preglej vse</Link>
            </div>
            <Alerts jobs={jobs} aging={aging} />
          </Card>

          <Finance aging={aging} />
          <ActivityCard />
        </div>
      </div>
    </div>
  );
}

function capitalize(s: string) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
function hhmm(iso: string) { const d = new Date(iso); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }

function dotClass(w: WorkOrderListItem) {
  if (w.hasOpenClock || w.status === 'in_progress') return 'bg-brand';
  if (w.status === 'ready') return 'bg-go';
  if (w.status === 'awaiting_parts' || w.status === 'awaiting_approval' || w.status === 'on_hold') return 'bg-safety';
  return 'bg-muted2';
}

function StatCard({ label, value, unit, chip, icon, href, linkLabel = 'Preglej vse', valueClass = 'text-4xl' }:
  { label: string; value: string; unit: string; chip: string; icon: React.ReactNode; href: string; linkLabel?: string; valueClass?: string }) {
  return (
    <Card className="flex flex-col p-4">
      <div className="flex items-center gap-3">
        <span className={`grid h-11 w-11 flex-none place-items-center rounded-xl ${chip}`}><Ico d={icon} /></span>
        <span className="text-sm font-semibold text-muted">{label}</span>
      </div>
      <div className={`num mt-3 font-extrabold leading-none tracking-tight text-ink ${valueClass}`}>{value}</div>
      <div className="mt-1 text-sm text-muted2">{unit}</div>
      <Link href={href} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand transition hover:gap-1.5">{linkLabel} <span aria-hidden>→</span></Link>
    </Card>
  );
}

function SectionHead({ title, href }: { title: string; href: string }) {
  return (
    <div className="flex items-center justify-between border-b border-line px-4 py-3">
      <h2 className="text-base font-bold text-ink">{title}</h2>
      <Link href={href} className="text-xs font-bold uppercase tracking-wide text-brand hover:underline">Preglej vse</Link>
    </div>
  );
}

function QuickTile({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 rounded-tool border border-line bg-surface px-3 py-3 transition hover:border-brandring hover:bg-brandweak">
      <span className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-brandweak text-brand"><Ico className="h-[18px] w-[18px]" d={icon} /></span>
      <span className="text-sm font-semibold leading-tight text-ink">{label}</span>
    </Link>
  );
}

function RowMenu({ w }: { w: WorkOrderListItem }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block text-left">
      <button onClick={() => setOpen((o) => !o)} onBlur={() => setTimeout(() => setOpen(false), 160)}
        className="grid h-8 w-8 place-items-center rounded-full text-muted2 transition hover:bg-line hover:text-ink" title="Več" aria-label="Več">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-tool border border-line bg-surface py-1 text-left shadow-lift">
          <Link href={`/advisor/work-orders/${w.id}`} className="block px-3 py-2 text-sm font-semibold text-ink hover:bg-floor">Odpri nalog</Link>
          {w.status === 'ready' && <Link href={`/advisor/invoices/issue/${w.id}`} className="block px-3 py-2 text-sm font-semibold text-ink hover:bg-floor">Izstavi račun</Link>}
        </div>
      )}
    </div>
  );
}

function Alerts({ jobs, aging }: { jobs: WorkOrderListItem[]; aging: any }) {
  const approvals = jobs.filter((w) => w.status === 'awaiting_approval').length;
  const ready = jobs.filter((w) => w.status === 'ready').length;
  const parts = jobs.filter((w) => w.status === 'awaiting_parts').length;
  const overdueMinor = aging ? overdue(aging) : 0n;

  const rows: Array<{ tone: 'stop' | 'hold' | 'info'; text: string; href: string }> = [];
  if (overdueMinor > 0n) rows.push({ tone: 'stop', text: `${formatMoneyMinor(overdueMinor.toString(), 'EUR')} zapadlih terjatev`, href: '/advisor/invoices' });
  if (approvals > 0) rows.push({ tone: 'hold', text: `${approvals} ${approvals === 1 ? 'nalog čaka' : 'nalogov čaka'} odobritev`, href: '/advisor/work-orders' });
  if (parts > 0) rows.push({ tone: 'hold', text: `${parts} ${parts === 1 ? 'nalog čaka' : 'nalogov čaka'} dele`, href: '/advisor/work-orders' });
  if (ready > 0) rows.push({ tone: 'info', text: `${ready} ${ready === 1 ? 'nalog za' : 'nalogov za'} izstavitev računa`, href: '/advisor/work-orders' });

  if (rows.length === 0) return <p className="text-sm text-muted">Trenutno ni opozoril.</p>;

  const chip = { stop: 'bg-[#fde8e6] text-stop', hold: 'bg-[#fbecd2] text-hold', info: 'bg-brandweak text-brand' } as const;
  return (
    <ul className="flex flex-col gap-1.5">
      {rows.map((r, i) => (
        <li key={i}>
          <Link href={r.href} className="group flex items-center gap-3 rounded-tool border border-line px-3 py-2.5 transition hover:border-brandring hover:bg-floor">
            <span className={`grid h-8 w-8 flex-none place-items-center rounded-lg ${chip[r.tone]}`}>
              <Ico className="h-[18px] w-[18px]" d={<path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />} />
            </span>
            <span className="min-w-0 flex-1 text-sm font-semibold leading-snug text-ink">{r.text}</span>
            <Ico className="h-4 w-4 flex-none text-muted2 transition group-hover:translate-x-0.5" d={<path d="m9 18 6-6-6-6" />} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Finance({ aging }: { aging: any }) {
  const totalMinorStr: string | null = aging?.buckets?.total ?? null;
  const total = totalMinorStr != null ? formatMoneyMinor(totalMinorStr, 'EUR') : '—';
  const overdueMinor = aging ? overdue(aging) : 0n;
  let totalMinor = 0n; try { totalMinor = BigInt(totalMinorStr ?? '0'); } catch { /* ignore */ }
  const currentMinor = totalMinor > overdueMinor ? totalMinor - overdueMinor : 0n;
  const pctCurrent = totalMinor > 0n ? Number((currentMinor * 1000n) / totalMinor) / 10 : 100;
  const pctOverdue = totalMinor > 0n ? Math.max(0, 100 - pctCurrent) : 0;

  return (
    <Card className="p-4">
      <h2 className="mb-2 text-base font-bold text-ink">Finančno stanje</h2>
      <p className="text-[0.7rem] font-bold uppercase tracking-wide text-muted2">Odprte terjatve</p>
      <p className="num mt-0.5 text-3xl font-extrabold tracking-tight text-ink">{total}</p>
      <p className="mb-2 text-xs text-muted2">EUR</p>
      <div className="mb-2">
        {overdueMinor > 0n ? <SoftChip tone="stop">zapadlo {fmtPct(pctOverdue)}%</SoftChip> : <SoftChip tone="go">vse v roku</SoftChip>}
      </div>
      <div className="mt-1 flex h-2.5 w-full overflow-hidden rounded-full bg-line">
        <span className="h-full bg-brand" style={{ width: `${pctCurrent}%` }} />
        <span className="h-full bg-stop" style={{ width: `${pctOverdue}%` }} />
      </div>
      <div className="mt-1.5 flex justify-between text-[0.7rem] text-muted2">
        <span className="num">v roku {formatMoneyMinor(currentMinor.toString(), 'EUR')}</span>
        {overdueMinor > 0n && <span className="num text-stop">zapadlo {formatMoneyMinor(overdueMinor.toString(), 'EUR')}</span>}
      </div>
      <Link href="/advisor/invoices" className="mt-3 inline-block text-xs font-bold uppercase tracking-wide text-brand hover:underline">Podrobnosti</Link>
    </Card>
  );
}
function fmtPct(n: number) { return Number.isInteger(n) ? String(n) : n.toFixed(1); }

/** Sum the overdue aging buckets (everything past current) in minor units. */
function overdue(aging: any): bigint {
  const b = aging?.buckets;
  if (!b) return 0n;
  const keys = ['d1_30', 'd31_60', 'd61_90', 'd90_plus'];
  let sum = 0n;
  for (const k of keys) { try { sum += BigInt(b[k] ?? '0'); } catch { /* ignore */ } }
  return sum;
}

/**
 * Recent activity — in demo from the central demo store, on the real stack
 * from GET /activity (a human-readable read of the audit chain). Hidden when
 * empty, so it is never a dead card.
 */
function ActivityCard() {
  const { data } = useSWR('advisor-activity', () => api.activity.list(8).catch(() => []), { refreshInterval: 15000 });
  const items = (data ?? []) as Array<{ id: string; message: string; createdAt: string }>;
  if (items.length === 0) return null;
  return (
    <Card className="p-4">
      <h2 className="mb-3 text-base font-bold text-ink">Nedavna aktivnost</h2>
      <ul className="flex flex-col gap-3">
        {items.slice(0, 6).map((a) => (
          <li key={a.id} className="flex items-start gap-2.5 text-sm">
            <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-brand" />
            <span className="min-w-0 flex-1 leading-snug text-steel">{a.message}</span>
            <span className="num flex-none whitespace-nowrap text-xs text-muted2">{activityTime(a.createdAt)}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
function activityTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay ? `danes ${hhmm(iso)}` : d.toLocaleDateString('sl-SI', { day: 'numeric', month: 'short' });
}

/**
 * Prvi koraki — onboarding za svežo delavnico (Faza A). Koraki NISO zastavice
 * v bazi, ampak so izvedeni iz DEJANSKIH podatkov (število strank, nalogov,
 * predračunov, terminov), zato kartica nikoli ne laže in pri vpeljanem tenantu
 * (vključno z demom) sama izgine. Seed gumb ustvari vzorčne podatke prek
 * istih REST klicev kot ročni vnos — nič posebnih poti.
 */
function OnboardingCard() {
  const { data: cust, mutate: mCust } = useSWR('onb-cust', () =>
    api.customers.search({ limit: 1 }).then((r: any) => ((r?.items ?? []) as any[]).length).catch(() => null));
  const { data: wos, mutate: mWos } = useSWR('onb-wo', () =>
    api.workOrders.list({ limit: 1 }).then((r: any) => (Array.isArray(r) ? r : r?.items ?? []).length).catch(() => null));
  const { data: ests } = useSWR('onb-est', () =>
    api.estimates.list().then((r: any) => (Array.isArray(r) ? r : r?.items ?? []).length).catch(() => null));
  const { data: apps } = useSWR('onb-app', () =>
    api.appointments.list().then((r: any) => (Array.isArray(r) ? r : r?.items ?? []).length).catch(() => null));
  const [seedBusy, setSeedBusy] = useState(false);
  const [seedErr, setSeedErr] = useState<string | null>(null);

  const counts = [cust, wos, ests, apps];
  if (counts.some((c) => c == null)) return null; // nalaganje ali napaka -> ne ugibamo
  const done = counts.filter((c) => (c as number) > 0).length;
  if (done === 4) return null;

  const steps = [
    { ok: (cust as number) > 0, label: 'Dodajte prvo stranko', hint: 'VIES uvoz po ID za DDV je vgrajen.', href: '/advisor/customers/new', cta: 'Nova stranka' },
    { ok: (wos as number) > 0, label: 'Ustvarite prvi delovni nalog', hint: 'Sprejem vozila, postavke, čas.', href: '/advisor/work-orders/new', cta: 'Nov nalog' },
    { ok: (ests as number) > 0, label: 'Pripravite prvi predračun', hint: 'Stranki ga pošljete v potrditev.', href: '/advisor/quotes/new', cta: 'Nov predračun' },
    { ok: (apps as number) > 0, label: 'Vpišite prvi termin', hint: 'Koledar sprejema in kapacitet.', href: '/advisor/calendar', cta: 'Koledar' },
  ];
  const allZero = counts.every((c) => c === 0);

  async function seed() {
    setSeedBusy(true); setSeedErr(null);
    try {
      const c1 = await api.customers.create({
        name: 'Prevozi Vzorec d.o.o.', type: 'company', country: 'SI', vatLiable: true, vatId: 'SI12345678',
        address: 'Industrijska cesta 1', postCode: '8340', city: 'Črnomelj',
        currency: 'EUR', paymentTermsDays: 30, discountPct: 0,
      });
      await api.customers.create({
        name: 'Avtoprevozništvo Novak s.p.', type: 'company', country: 'SI', vatLiable: true,
        address: 'Obrtna ulica 5', postCode: '8000', city: 'Novo mesto',
        currency: 'EUR', paymentTermsDays: 15, discountPct: 0,
      });
      if (c1?.id) {
        await api.assets.create({ customerId: c1.id, type: 'truck', plate: 'NM AB-123', countryOfPlate: 'SI', make: 'MAN', model: 'TGX' });
      }
      await Promise.all([mCust(), mWos()]);
    } catch (e) {
      setSeedErr(e instanceof Error ? e.message : 'Vzorčnih podatkov ni bilo mogoče ustvariti.');
    } finally {
      setSeedBusy(false);
    }
  }

  return (
    <section className="rounded-card border border-brandring bg-brandweak/40 p-5 shadow-card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-extrabold text-ink">Prvi koraki</h2>
          <p className="text-sm text-muted">Postavite delavnico v nekaj minutah.</p>
        </div>
        <span className="rounded-full bg-surface px-3 py-1 text-xs font-bold text-brand shadow-card">{done}/4</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {steps.map((st, i) => (
          <div key={st.label} className={`flex items-center gap-3 rounded-tool border px-3 py-2.5 ${st.ok ? 'border-line bg-surface/60' : 'border-line bg-surface'}`}>
            <span className={`grid h-7 w-7 flex-none place-items-center rounded-full text-xs font-bold ${st.ok ? 'bg-emerald-500 text-white' : 'bg-brandweak text-brand'}`}>
              {st.ok ? '✓' : i + 1}
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className={`block truncate text-sm font-bold ${st.ok ? 'text-muted line-through' : 'text-ink'}`}>{st.label}</span>
              <span className="block truncate text-xs text-muted2">{st.hint}</span>
            </span>
            {!st.ok && (
              <Link href={st.href} className="flex-none rounded-tool bg-brand px-3 py-1.5 text-xs font-bold text-white transition hover:bg-brand700">
                {st.cta}
              </Link>
            )}
          </div>
        ))}
      </div>
      {allZero && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button onClick={seed} disabled={seedBusy}
            className="rounded-tool border border-brandring bg-surface px-3 py-2 text-xs font-bold text-brand transition hover:bg-brandweak disabled:opacity-60">
            {seedBusy ? 'Ustvarjam …' : 'Začni s preizkusnimi podatki'}
          </button>
          <span className="text-xs text-muted2">Ustvari 2 vzorčni stranki in tovornjak — prek istih API klicev kot ročni vnos.</span>
        </div>
      )}
      {seedErr && <p className="mt-2 text-xs font-semibold text-rose-600">{seedErr}</p>}
    </section>
  );
}
