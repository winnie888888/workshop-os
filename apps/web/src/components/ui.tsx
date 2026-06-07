'use client';

import React from 'react';

/*
 * Design-system primitives shared by all three interfaces. They encode the
 * non-negotiable ergonomics from the UX specs — large gloved-finger targets,
 * heavy high-contrast surfaces, status conveyed by colour blocks not thin text —
 * so individual screens compose behaviour rather than reinventing styling.
 */

type Tone = 'go' | 'hold' | 'stop' | 'info' | 'neutral' | 'safety';

const toneBg: Record<Tone, string> = {
  go: 'bg-go text-white',
  hold: 'bg-hold text-white',
  stop: 'bg-stop text-white',
  info: 'bg-info text-white',
  safety: 'bg-safety text-ink',
  neutral: 'bg-steel text-white',
};

const toneSoft: Record<Tone, string> = {
  go: 'bg-go/10 text-go border-go/30',
  hold: 'bg-hold/10 text-hold border-hold/30',
  stop: 'bg-stop/10 text-stop border-stop/30',
  info: 'bg-info/10 text-info border-info/30',
  safety: 'bg-safety/20 text-ink border-safety/50',
  neutral: 'bg-steel/10 text-steel border-steel/20',
};

/** A large, gloved-finger primary action. */
export function Button({
  children, onClick, tone = 'neutral', size = 'md', disabled, type = 'button', full, className = '',
}: {
  children: React.ReactNode; onClick?: () => void; tone?: Tone;
  size?: 'md' | 'lg' | 'xl'; disabled?: boolean; type?: 'button' | 'submit'; full?: boolean; className?: string;
}) {
  const sizes = {
    md: 'min-h-tap px-5 text-tap',
    lg: 'min-h-[4.25rem] px-6 text-xl',
    xl: 'min-h-[5.5rem] px-8 text-2xl',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`tool-tap inline-flex items-center justify-center gap-3 rounded-tool font-display font-bold
        tracking-tight shadow-tool transition active:translate-y-px disabled:opacity-40 disabled:active:translate-y-0
        ${toneBg[tone]} ${sizes[size]} ${full ? 'w-full' : ''} ${className}`}
    >
      {children}
    </button>
  );
}

/** A strong status pill (colour block, sun-legible). */
export function StatusChip({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold uppercase
      tracking-wide ${toneBg[tone]}`}>
      {children}
    </span>
  );
}

/** A soft, bordered chip for secondary status (e.g. on light cards). */
export function SoftChip({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold
      uppercase tracking-wide ${toneSoft[tone]}`}>
      {children}
    </span>
  );
}

/** A raised tool-surface card. */
export function Card({ children, className = '', onClick }: {
  children: React.ReactNode; className?: string; onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-tool border border-line bg-panel shadow-tool ${onClick ? 'cursor-pointer active:translate-y-px transition' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

/** A large square tile button (the mechanic's four field actions). */
export function TileButton({ icon, label, onClick, badge, tone = 'neutral' }: {
  icon: React.ReactNode; label: string; onClick?: () => void; badge?: number; tone?: Tone;
}) {
  return (
    <button
      onClick={onClick}
      className={`tool-tap relative flex aspect-square w-full flex-col items-center justify-center gap-2
        rounded-tool border-2 border-ink/10 bg-panel shadow-tool transition active:translate-y-px`}
    >
      <span className={`flex h-14 w-14 items-center justify-center rounded-full ${toneSoft[tone]}`}>
        {icon}
      </span>
      <span className="font-display text-xl font-bold tracking-tight">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="absolute right-3 top-3 flex h-7 min-w-7 items-center justify-center rounded-full
          bg-info px-1.5 text-sm font-bold text-white">{badge}</span>
      )}
    </button>
  );
}

/** A full-screen modal overlay used for the mechanic's capture surfaces. */
export function Sheet({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="mt-auto rounded-t-2xl bg-floor p-5 pb-8 shadow-lift"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-line" />
        <h2 className="mb-4 font-display text-2xl font-bold tracking-tight">{title}</h2>
        {children}
      </div>
    </div>
  );
}

/** Inline error / problem banner (reads ApiError nicely). */
export function ProblemBanner({ message, tone = 'stop' }: { message: string; tone?: Tone }) {
  return (
    <div className={`rounded-tool border px-4 py-3 text-sm font-semibold ${toneSoft[tone]}`} role="alert">
      {message}
    </div>
  );
}

/** A simple stepper for integer quantities (large targets). */
export function Stepper({ value, onChange, min = 1, max = 999 }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number;
}) {
  return (
    <div className="flex items-center gap-4">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        className="tool-tap flex h-14 w-14 items-center justify-center rounded-tool border-2 border-ink/15
          bg-panel text-3xl font-bold">–</button>
      <span className="min-w-12 text-center font-mono text-3xl font-bold">{value}</span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        className="tool-tap flex h-14 w-14 items-center justify-center rounded-tool border-2 border-ink/15
          bg-panel text-3xl font-bold">+</button>
    </div>
  );
}

/** Tiny inline spinner for in-flight actions (never blocks the screen). */
export function Spinner({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-block h-5 w-5 animate-spin rounded-full border-2 border-current
      border-t-transparent ${className}`} aria-label="loading" />
  );
}
