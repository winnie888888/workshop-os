'use client';

import Link from 'next/link';
import { DEMO_MODE } from '@/lib/demo';
import { Card } from '@/components/ui';
import { ItemForm } from '../item-form';

export default function NewItemPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <button onClick={() => history.back()} className="self-start text-sm font-semibold text-muted hover:text-brand">‹ Postavke</button>
      <h1 className="text-3xl font-extrabold tracking-tight text-ink">Nov artikel</h1>

      {DEMO_MODE ? (
        <ItemForm mode="create" />
      ) : (
        <Card className="border-hold/40 bg-hold/5 p-6">
          <p className="font-semibold text-ink">Vnos artiklov je na voljo v demo načinu.</p>
          <p className="mt-1 text-sm text-muted">
            Zaledni del (NestJS) še nima končne točke za ustvarjanje artiklov. Ko jo dodava
            (<span className="num">POST /inventory/items</span>), bo ta obrazec deloval tudi v realnem načinu.
          </p>
          <Link href="/warehouse/items" className="mt-3 inline-block text-sm font-semibold text-brand">‹ Nazaj na Postavke</Link>
        </Card>
      )}
    </div>
  );
}
