'use client';

import Link from 'next/link';
import { DEMO_MODE } from '@/lib/demo';
import { Card } from '@/components/ui';
import { PresetForm } from '../preset-form';

export default function NewPresetPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <button onClick={() => history.back()} className="self-start text-sm font-semibold text-muted hover:text-brand">‹ Paketi</button>
      <h1 className="text-3xl font-extrabold tracking-tight text-ink">Nov servisni paket</h1>
      {DEMO_MODE ? (
        <PresetForm mode="create" />
      ) : (
        <Card className="border-hold/40 bg-hold/5 p-6">
          <p className="font-semibold text-ink">Ustvarjanje paketov je na voljo v demo načinu.</p>
          <p className="mt-1 text-sm text-muted">Zaledni del še nima končne točke <span className="num">/presets</span>.</p>
          <Link href="/warehouse/presets" className="mt-3 inline-block text-sm font-semibold text-brand">‹ Nazaj na Pakete</Link>
        </Card>
      )}
    </div>
  );
}
