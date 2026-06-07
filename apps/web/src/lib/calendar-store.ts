'use client';

import { createLocalCollection, newId } from './local-store';

/*
 * Koledar — termini delavnice. Lokalna plast (delovni nalogi nimajo datuma),
 * swap-ready za pravi /appointments. Page kliče samo `apptStore`.
 */

export type ApptStatus = 'scheduled' | 'done' | 'cancelled';

export interface Appointment {
  id: string;
  createdAt: string;
  date: string;   // yyyy-mm-dd
  time: string;   // HH:MM
  durationMin: number;
  customerId?: string;
  customerName: string;
  vehicle: string;
  service: string;
  note: string;
  status: ApptStatus;
}

export const apptStore = createLocalCollection<Appointment>('wos.appointments.v1', 200);

export function makeAppointment(date: string): Appointment {
  return {
    id: newId('appt'),
    createdAt: new Date().toISOString(),
    date,
    time: '08:00',
    durationMin: 60,
    customerName: '',
    vehicle: '',
    service: '',
    note: '',
    status: 'scheduled',
  };
}

export function apptStatusLabel(s: ApptStatus): string {
  return s === 'scheduled' ? 'načrtovano' : s === 'done' ? 'opravljeno' : 'preklicano';
}

/* Monday-based week helpers (local time). */
export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function startOfWeek(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (x.getDay() + 6) % 7; // 0 = Monday
  x.setDate(x.getDate() - day);
  return x;
}
export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
export const WEEKDAY_LABELS = ['Pon', 'Tor', 'Sre', 'Čet', 'Pet', 'Sob', 'Ned'];
