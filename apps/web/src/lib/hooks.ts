'use client';

import { useEffect, useState } from 'react';

/**
 * useNow — re-renders on an interval so a running timer ticks. Used by the
 * mechanic Job screen's clock. Defaults to once per second.
 */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/**
 * useOnlineStatus — tracks connectivity so the UI can show "saved on this
 * device" vs "synced". It never blocks the user; it only labels state.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  return online;
}
