'use client';

import Link from 'next/link';
import React from 'react';

/*
 * Skupna spodnja mobilna navigacija (mockup: Domov / Iskanje / + / Obvestila /
 * Meni). Vidna samo pod lg — na namizju ostane stranska letev. Lupine jo
 * konfigurirajo prek `items`: povezava (href), akcija (onClick) ali dvignjen
 * osrednji gumb (fab). Ikone so po ključu, da so klicna mesta kratka; neznan
 * ključ pade na "menu" in ne podre aplikacije.
 */

type IconFn = (cls: string) => JSX.Element;
const ICONS: Record<string, IconFn> = {
  home: (c) => (<svg viewBox="0 0 24 24" className={c} fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>),
  search: (c) => (<svg viewBox="0 0 24 24" className={c} fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>),
  plus: (c) => (<svg viewBox="0 0 24 24" className={c} fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M12 5v14M5 12h14"/></svg>),
  bell: (c) => (<svg viewBox="0 0 24 24" className={c} fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>),
  menu: (c) => (<svg viewBox="0 0 24 24" className={c} fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>),
  dashboard: (c) => (<svg viewBox="0 0 24 24" className={c} fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>),
  box: (c) => (<svg viewBox="0 0 24 24" className={c} fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 8 12 3 3 8l9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/></svg>),
};

export type TabItem = {
  label: string;
  icon: string;
  /** Dvignjen osrednji gumb (modri krog). Zahteva href. */
  fab?: boolean;
} & ({ href: string; onClick?: never } | { onClick: () => void; href?: never });

export function MobileTabBar({ items }: { items: TabItem[] }) {
  const itemCls = 'flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[0.65rem] font-semibold text-muted transition hover:text-ink';
  return (
    <nav aria-label="Mobilna navigacija"
      className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-line bg-surface pb-[max(0.25rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(15,27,45,.07)] lg:hidden">
      {items.map((it) => {
        const Icon = ICONS[it.icon] ?? ICONS.menu;
        if (it.fab && it.href) {
          return (
            <Link key={it.label} href={it.href} aria-label={it.label}
              className="relative -mt-4 flex w-16 flex-none items-start justify-center">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-brand text-white shadow-lift transition active:translate-y-px">
                {Icon('h-6 w-6')}
              </span>
            </Link>
          );
        }
        if (it.href) {
          return (
            <Link key={it.label} href={it.href} className={itemCls}>
              {Icon('h-5 w-5')}
              {it.label}
            </Link>
          );
        }
        return (
          <button key={it.label} type="button" onClick={it.onClick} className={itemCls}>
            {Icon('h-5 w-5')}
            {it.label}
          </button>
        );
      })}
    </nav>
  );
}
