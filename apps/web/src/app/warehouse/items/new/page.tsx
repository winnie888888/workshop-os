'use client';

import { ItemForm } from '../item-form';

export default function NewItemPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <button onClick={() => history.back()} className="self-start text-sm font-semibold text-muted hover:text-brand">‹ Postavke</button>
      <h1 className="text-3xl font-extrabold tracking-tight text-ink">Nov artikel</h1>

      <ItemForm mode="create" />
    </div>
  );
}
