'use client';

import { createLocalCollection, newId } from './local-store';

/*
 * Premiki + Inventura — lokalna plast (ni zalednih endpointov za ta dva toka).
 * Swap-ready za /stock-movements in /stock-ops/counts.
 */

export type MoveType = 'in' | 'out' | 'transfer' | 'adjust';

export interface StockMovement {
  id: string;
  createdAt: string;
  item: string;
  qty: string;
  type: MoveType;
  fromLoc: string;
  toLoc: string;
  note: string;
}

export const movementStore = createLocalCollection<StockMovement>('wos.stock.movements.v1', 200);

export function makeMovement(): StockMovement {
  return { id: newId('mov'), createdAt: new Date().toISOString(), item: '', qty: '', type: 'in', fromLoc: '', toLoc: 'Glavno skladišče', note: '' };
}
export function moveTypeLabel(t: MoveType): string {
  return t === 'in' ? 'Prejem' : t === 'out' ? 'Izdaja' : t === 'transfer' ? 'Premik' : 'Korekcija';
}

export interface CountLine { id: string; item: string; counted: string; }
export interface CountSession {
  id: string;
  createdAt: string;
  location: string;
  status: 'open' | 'closed';
  lines: CountLine[];
}

export const countStore = createLocalCollection<CountSession>('wos.stock.counts.v1', 100);

export function makeCountLine(): CountLine { return { id: newId('cl'), item: '', counted: '' }; }
export function makeCountSession(): CountSession {
  return { id: newId('count'), createdAt: new Date().toISOString(), location: 'Glavno skladišče', status: 'open', lines: [makeCountLine()] };
}
