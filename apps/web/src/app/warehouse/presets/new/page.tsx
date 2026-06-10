'use client';

import { PresetForm } from '../preset-form';

export default function NewPresetPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <button onClick={() => history.back()} className="self-start text-sm font-semibold text-muted hover:text-brand">‹ Paketi</button>
      <h1 className="text-3xl font-extrabold tracking-tight text-ink">Nov servisni paket</h1>
      <PresetForm mode="create" />
    </div>
  );
}
