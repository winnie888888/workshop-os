'use client';

import { createLocalCollection, newId } from './local-store';

/* Lokalni dobavitelji za demo; ob dodajanju poskusimo tudi pravi /suppliers. */
export interface Supplier {
  id: string;
  createdAt?: string;
  name: string;
  vatId?: string;
  email?: string;
  phone?: string;
  note?: string;
  local?: boolean;
}

export const supplierLocalStore = createLocalCollection<Supplier>('wos.suppliers.local.v1');

export function makeSupplier(): Supplier {
  return { id: newId('sup'), createdAt: new Date().toISOString(), name: '', vatId: '', email: '', phone: '', note: '', local: true };
}
