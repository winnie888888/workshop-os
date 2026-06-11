'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { api, ApiError, type MemberPermissions } from '@/lib/api';
import { Button, Card, ProblemBanner, SoftChip, Spinner, StatusChip } from '@/components/ui';

/*
 * Uporabniki & pravice (mockup "Pravice uporabnikov", P1).
 *
 * Levo člani delavnice, desno matrika pravic izbranega člana: kljukica pomeni
 * EFEKTIVNO pravico. Vir je označen — "vloga" pride iz vlog članstva, "ročno"
 * je izjema. Ob shranjevanju UI izračuna čisti diff proti vlogam (base s
 * strežnika): kar vloga že daje in je obkljukano, NE postane izjema; izjema
 * nastane samo tam, kjer se želeno stanje razlikuje od vlog. Tako matrika
 * ostane berljiva in audit zapis minimalen. Deny zmaga nad vsem (shared).
 */

const ROLE_LABEL: Record<string, string> = {
  owner: 'Lastnik', admin: 'Administrator', advisor: 'Svetovalec', mechanic: 'Mehanik',
  warehouse: 'Skladiščnik', accountant: 'Računovodja', read_only: 'Samo branje', fleet_manager: 'Upravitelj flote',
};

const PERMISSION_META: Record<string, { label: string; group: string }> = {
  'workorder:create': { label: 'Ustvarjanje delovnih nalogov', group: 'Delovni nalogi' },
  'workorder:edit': { label: 'Urejanje delovnih nalogov', group: 'Delovni nalogi' },
  'workorder:line_time': { label: 'Postavke in ure na nalogu', group: 'Delovni nalogi' },
  'estimate:manage': { label: 'Predračuni', group: 'Delovni nalogi' },
  'appointment:manage': { label: 'Koledar / termini', group: 'Delovni nalogi' },
  'preset:manage': { label: 'Servisni paketi', group: 'Delovni nalogi' },
  'invoice:issue': { label: 'Izstavljanje računov', group: 'Računi in finance' },
  'pricing:edit': { label: 'Urejanje cen', group: 'Računi in finance' },
  'analytics:financial_view': { label: 'Finančne analize', group: 'Računi in finance' },
  'ai:approve_financial': { label: 'Potrjevanje AI predlogov (finance)', group: 'Računi in finance' },
  'payroll:export': { label: 'Izvoz za plače / računovodstvo', group: 'Računi in finance' },
  'stock:receive': { label: 'Prevzem blaga', group: 'Skladišče' },
  'stock:adjust': { label: 'Popravki zaloge / inventura', group: 'Skladišče' },
  'stock:transfer': { label: 'Prenosi med lokacijami', group: 'Skladišče' },
  'purchase:manage': { label: 'Naročilnice dobaviteljem', group: 'Skladišče' },
  'customer:manage': { label: 'Upravljanje strank', group: 'Stranke in vozila' },
  'rental:manage': { label: 'Najem vozil', group: 'Stranke in vozila' },
  'attendance:manage': { label: 'Upravljanje prisotnosti', group: 'Kadri' },
  'leave:approve': { label: 'Odobravanje dopustov', group: 'Kadri' },
  'travel_order:manage': { label: 'Potni nalogi', group: 'Kadri' },
  'tenant:manage': { label: 'Upravljanje delavnice', group: 'Uprava' },
  'integrations:manage': { label: 'Integracije', group: 'Uprava' },
  'data:export': { label: 'Izvoz podatkov (GDPR)', group: 'Uprava' },
};
const GROUP_ORDER = ['Delovni nalogi', 'Računi in finance', 'Skladišče', 'Stranke in vozila', 'Kadri', 'Uprava', 'Drugo'];

export default function UsersPermissions() {
  const { data: members, error, mutate } = useSWR('members', () => api.members.list());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId && members?.length) setSelectedId(members[0].userId);
  }, [members, selectedId]);

  const selected = members?.find((m) => m.userId === selectedId) ?? null;

  if (error) {
    const msg = error instanceof ApiError ? error.message : 'Seznama članov ni bilo mogoče naložiti.';
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-4 text-3xl font-extrabold tracking-tight text-ink">Uporabniki in pravice</h1>
        <ProblemBanner message={msg} tone="hold" />
        <p className="mt-3 text-sm text-muted">
          Na demo povezavi upravljanje pravic ni na voljo — ta zaslon dela proti pravemu API-ju.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Uporabniki in pravice</h1>
        <p className="mt-0.5 text-sm text-muted">
          Vloge dajejo osnovo, kljukice pa lahko posamezniku pravico dodajo ali vzamejo. Ročna izjema vedno zmaga.
        </p>
      </div>

      {!members ? (
        <div className="flex justify-center py-16"><Spinner className="text-brand" /></div>
      ) : members.length === 0 ? (
        <Card className="p-8 text-center text-muted">V tej delavnici še ni članov.</Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
          {/* Člani */}
          <Card className="overflow-hidden self-start">
            <div className="border-b border-line px-4 py-3">
              <h2 className="text-base font-bold text-ink">Člani <span className="num text-muted2">({members.length})</span></h2>
            </div>
            <ul className="divide-y divide-line">
              {members.map((m) => (
                <li key={m.userId}>
                  <button onClick={() => setSelectedId(m.userId)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${m.userId === selectedId ? 'bg-brandweak' : 'hover:bg-floor'}`}>
                    <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-gradient-to-br from-brand to-brand700 text-sm font-bold text-white">
                      {m.name.trim().charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-ink">{m.name}</span>
                      <span className="block truncate text-xs text-muted">{m.email}</span>
                    </span>
                    {!m.active && <SoftChip tone="stop">neaktiven</SoftChip>}
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          {/* Matrika */}
          {selected && (
            <PermissionMatrix
              key={selected.userId}
              member={selected}
              onSaved={(updated) => {
                void mutate(
                  (prev) => prev?.map((m) => (m.userId === updated.userId ? { ...m, ...updated } : m)),
                  { revalidate: false },
                );
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function PermissionMatrix({ member, onSaved }: {
  member: MemberPermissions;
  onSaved: (m: MemberPermissions) => void;
}) {
  const base = useMemo(() => new Set(member.base), [member]);
  const [checked, setChecked] = useState<Set<string>>(() => new Set(member.effective));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  // Katalog = vse pravice, ki jih sistem pozna (base ∪ effective ∪ meta);
  // neznane gredo v "Drugo", da nova pravica v kodi takoj dobi vrstico.
  const groups = useMemo(() => {
    const all = new Set<string>([...Object.keys(PERMISSION_META), ...member.base, ...member.effective, ...member.overrides.map((o) => o.permission)]);
    const byGroup = new Map<string, string[]>();
    for (const p of all) {
      const g = PERMISSION_META[p]?.group ?? 'Drugo';
      byGroup.set(g, [...(byGroup.get(g) ?? []), p]);
    }
    for (const [g, list] of byGroup) byGroup.set(g, list.sort((a, b) => (PERMISSION_META[a]?.label ?? a).localeCompare(PERMISSION_META[b]?.label ?? b, 'sl')));
    return GROUP_ORDER.filter((g) => byGroup.has(g)).map((g) => ({ group: g, perms: byGroup.get(g)! }));
  }, [member]);

  const dirty = useMemo(() => {
    const eff = new Set(member.effective);
    if (eff.size !== checked.size) return true;
    for (const p of checked) if (!eff.has(p)) return true;
    return false;
  }, [checked, member]);

  function toggle(p: string) {
    setSavedFlash(false);
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p); else next.add(p);
      return next;
    });
  }

  async function save() {
    setBusy(true); setErr(null);
    try {
      // Diff proti vlogam: izjema nastane samo, kjer se želeno stanje razlikuje.
      const overrides: Array<{ permission: string; allow: boolean }> = [];
      const all = new Set<string>([...base, ...checked, ...member.overrides.map((o) => o.permission), ...Object.keys(PERMISSION_META)]);
      for (const p of all) {
        const want = checked.has(p);
        const fromRole = base.has(p);
        if (want && !fromRole) overrides.push({ permission: p, allow: true });
        if (!want && fromRole) overrides.push({ permission: p, allow: false });
      }
      const updated = await api.members.putOverrides(member.userId, overrides);
      onSaved({ ...member, ...updated });
      setSavedFlash(true);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Shranjevanje ni uspelo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="self-start p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-bold text-ink">{member.name}</h2>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {member.roles.map((r) => <SoftChip key={r} tone="info">{ROLE_LABEL[r] ?? r}</SoftChip>)}
            {member.roles.length === 0 && <SoftChip tone="neutral">brez vlog</SoftChip>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {savedFlash && !dirty && <StatusChip tone="go">Shranjeno</StatusChip>}
          <Button tone="info" onClick={save} disabled={busy || !dirty}>
            {busy ? <Spinner /> : 'Shrani pravice'}
          </Button>
        </div>
      </div>

      {err && <div className="mb-4"><ProblemBanner message={err} /></div>}

      <div className="flex flex-col gap-5">
        {groups.map(({ group, perms }) => (
          <div key={group}>
            <h3 className="mb-2 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.12em] text-muted2">
              {group}<span className="h-px flex-1 bg-line" />
            </h3>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {perms.map((p) => {
                const on = checked.has(p);
                const fromRole = base.has(p);
                const manual = on !== fromRole; // želeno stanje odstopa od vlog -> izjema
                return (
                  <label key={p}
                    className={`flex min-h-tap cursor-pointer items-center gap-3 rounded-tool border px-3 py-2 transition
                      ${on ? 'border-brandring bg-brandweak/60' : 'border-line bg-surface hover:bg-floor'}`}>
                    <input type="checkbox" checked={on} onChange={() => toggle(p)}
                      className="h-4 w-4 flex-none accent-[#1A6BEF]" />
                    <span className="min-w-0 flex-1 text-sm font-semibold text-ink">{PERMISSION_META[p]?.label ?? p}</span>
                    {manual
                      ? <SoftChip tone={on ? 'go' : 'stop'}>{on ? 'ročno +' : 'ročno −'}</SoftChip>
                      : fromRole && <span className="text-[0.65rem] font-bold uppercase tracking-wide text-muted2">vloga</span>}
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-5 text-xs text-muted">
        »Vloga« = pravica izhaja iz vlog člana. »Ročno +/−« = izjema, ki vlogi nekaj doda ali vzame; shrani se šele s klikom na gumb.
        Sprememba velja takoj (najkasneje v nekaj sekundah). Sebi ni mogoče odvzeti upravljanja delavnice.
      </p>
    </Card>
  );
}
