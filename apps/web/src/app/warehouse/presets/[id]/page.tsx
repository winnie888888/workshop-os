'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { Button, Card, Spinner } from '@/components/ui';
import { PresetForm } from '../preset-form';

export default function EditPresetPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: preset, isLoading } = useSWR(['preset', id], () => api.presets.get(id));

  if (isLoading || !preset) return <div className="flex justify-center py-16"><Spinner className="text-brand" /></div>;
  if (!preset.id) return (
    <div className="mx-auto max-w-3xl"><Card className="p-6"><p className="text-muted">Paket ni najden.</p><Link href="/warehouse/presets" className="mt-3 inline-block text-sm font-semibold text-brand">‹ Paketi</Link></Card></div>
  );

  async function del() {
    if (!window.confirm('Izbrišem ta paket? Tega ni mogoče razveljaviti.')) return;
    await api.presets.remove(id);
    router.push('/warehouse/presets');
    router.refresh();
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <button onClick={() => history.back()} className="self-start text-sm font-semibold text-muted hover:text-brand">‹ Paketi</button>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">{preset.name}</h1>
        <Button tone="stop" onClick={del}>Izbriši</Button>
      </div>
      <PresetForm mode="edit" initial={preset} />
    </div>
  );
}
