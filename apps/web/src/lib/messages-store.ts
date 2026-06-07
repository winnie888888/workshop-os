'use client';

import { createLocalCollection, newId } from './local-store';

/*
 * Sporočila — SMS niti s strankami. Lokalna shramba (demo pošiljanje), swap-ready
 * za pravi /messages + SMS ponudnik. Page kliče samo `convStore` + helperje.
 */

export interface Message {
  id: string;
  at: string;
  direction: 'out' | 'in';
  body: string;
}

export interface Conversation {
  id: string;
  customerId?: string;
  customerName: string;
  phone: string;
  lastAt: string;
  messages: Message[];
}

export const convStore = createLocalCollection<Conversation>('wos.conversations.v1', 100);

export function newMessage(direction: 'out' | 'in', body: string): Message {
  return { id: newId('msg'), at: new Date().toISOString(), direction, body };
}

export function makeConversation(customerName: string, phone: string, customerId?: string): Conversation {
  return { id: newId('conv'), customerId, customerName, phone, lastAt: new Date().toISOString(), messages: [] };
}

/* Seed a couple of demo threads the first time, so the screen isn't empty. */
export async function seedDemoIfEmpty(): Promise<void> {
  const existing = await convStore.list(1);
  if (existing.length > 0) return;
  const now = Date.now();
  const c1 = makeConversation('Transport Horvat d.o.o.', '+386 41 123 456', 'cust-horvat');
  c1.messages = [
    { id: newId('msg'), at: new Date(now - 3600_000 * 5).toISOString(), direction: 'out', body: 'Pozdravljeni, vozilo NM CK-412 je pripravljeno za prevzem.' },
    { id: newId('msg'), at: new Date(now - 3600_000 * 4).toISOString(), direction: 'in', body: 'Hvala, pridem jutri dopoldne.' },
  ];
  c1.lastAt = c1.messages[c1.messages.length - 1].at;
  const c2 = makeConversation('Prevozi Novak s.p.', '+386 31 987 654');
  c2.messages = [
    { id: newId('msg'), at: new Date(now - 3600_000 * 26).toISOString(), direction: 'out', body: 'Dodatno delo na zavorah zahteva vašo odobritev. Odprite portal za pregled.' },
  ];
  c2.lastAt = c2.messages[c2.messages.length - 1].at;
  await convStore.save(c2);
  await convStore.save(c1);
}
