'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/*
 * The warehouse shell is deliberately PHONE-FIRST, unlike the advisor desk: the
 * clerk is standing at the receiving bay with a phone in one hand and a delivery
 * note in the other. Big touch targets, a single column, a simple top bar, and a
 * bottom action area. No command bar — the warehouse flow is task-driven (scan a
 * note, review, confirm), not search-driven.
 */
export default function WarehouseLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col bg-floor">
      <TopBar />
      <main className="min-w-0 flex-1 p-4 pb-24">{children}</main>
    </div>
  );
}

const NAV = [
  { href: '/warehouse', label: 'Receiving' },
  { href: '/warehouse/stock', label: 'Stock' },
];

function TopBar() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-ink px-4 py-3 text-white">
      <div>
        <div className="font-display text-lg font-extrabold tracking-tight">A-SPRINT</div>
        <div className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-white/50">Warehouse</div>
      </div>
      <nav className="flex gap-1">
        {NAV.map((n) => {
          const active = n.href === '/warehouse' ? path === n.href : path.startsWith(n.href);
          return (
            <Link key={n.href} href={n.href}
              className={`rounded-tool px-3 py-2 text-sm font-semibold transition
                ${active ? 'bg-safety text-ink' : 'text-white/80 hover:bg-white/10'}`}>
              {n.label}
            </Link>
          );
        })}
        <Link href="/" className="rounded-tool px-2 py-2 text-sm text-white/40 hover:text-white/70">←</Link>
      </nav>
    </header>
  );
}
