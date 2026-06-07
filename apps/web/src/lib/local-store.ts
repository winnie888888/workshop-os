'use client';

/*
 * Generic localStorage-backed collection with an ASYNC interface.
 *
 * The async signatures (list/save/remove/clear all return Promises) are
 * deliberate: today these resolve from localStorage, but the very same calls can
 * later be backed by real API endpoints WITHOUT touching any caller. To go live,
 * swap the body of these methods for `request(...)` calls — the pages don't care.
 */

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export interface LocalCollection<T extends { id: string }> {
  list(limit?: number): Promise<T[]>;
  save(row: T): Promise<T>;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
}

export function createLocalCollection<T extends { id: string }>(
  storageKey: string,
  cap = 50,
): LocalCollection<T> {
  function read(): T[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as T[]) : [];
    } catch {
      return [];
    }
  }
  function write(rows: T[]): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(rows.slice(0, cap)));
    } catch {
      /* ignore quota / private-mode errors */
    }
  }
  return {
    async list(limit = 20) {
      return read().slice(0, limit);
    },
    async save(row: T) {
      const rows = read();
      const idx = rows.findIndex((r) => r.id === row.id);
      if (idx >= 0) rows[idx] = row;
      else rows.unshift(row);
      write(rows);
      return row;
    },
    async remove(id: string) {
      write(read().filter((r) => r.id !== id));
    },
    async clear() {
      write([]);
    },
  };
}
