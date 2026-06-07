'use client';

import React from 'react';

/*
 * Design-system primitives shared by all interfaces. Clean, business, Minimax-
 * aligned: light surfaces, a single blue brand accent, soft status pills, and
 * touch-friendly targets retained for the shop floor. Signatures are unchanged
 * so screens keep composing behaviour without restyling themselves.
 */

type Tone = 'go' | 'hold' | 'stop' | 'info' | 'neutral' | 'safety';

// Filled button styles per tone. Default (neutral) is a tonal brand button —
// clearly actionable and on-brand; use tone="info" for a strong primary.
const btnTone: Record<Tone, string> = {
  neutral: 'bg-brandweak text-brand border border-brandring hover:bg-brandring/40',
  info: 'bg-brand text-white shadow-tool hover:bg-brand600',
  go: 'bg-go text-white hover:brightness-110',
  hold: 'bg-hold text-white hover:brightness-110',
  stop: 'bg-stop text-white hover:brightness-110',
  safety: 'bg-safety text-ink hover:brightness-105',
};

// Soft status pill (tint + colored text), with a leading dot.
const pillTone: Record<Tone, string> = {
  go: 'bg-go/10 text-go',
  hold: 'bg-hold/10 text-hold',
  stop: 'bg-stop/10 text-stop',
  info: 'bg-brand/10 text-brand',
  safety: 'bg-safety/15 text-hold',
  neutral: 'bg-ink/5 text-steel',
};

// Soft bordered chip for secondary status on light cards.
const softTone: Record<Tone, string> = {
  go: 'bg-go/10 text-go border-go/25',
  hold: 'bg-hold/10 text-hold border-hold/25',
  stop: 'bg-stop/10 text-stop border-stop/25',
  info: 'bg-brand/10 text-brand border-brand/25',
  safety: 'bg-safety/15 text-hold border-safety/30',
  neutral: 'bg-surface2 text-steel border-line',
};

/** A primary action. Default tone is a tonal brand button; tone="info" is the strong primary. */
export function Button({
  children, onClick, tone = 'neutral', size = 'md', disabled, type = 'button', full, className = '',
}: {
  children: React.ReactNode; onClick?: () => void; tone?: Tone;
  size?: 'sm' | 'md' | 'lg' | 'xl'; disabled?: boolean; type?: 'button' | 'submit'; full?: boolean; className?: string;
}) {
  const sizes = {
    sm: 'h-9 px-3 text-sm',
    md: 'min-h-tap px-4 text-base',
    lg: 'min-h-[3.5rem] px-6 text-lg',
    xl: 'min-h-[4.25rem] px-8 text-xl',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`tool-tap inline-flex items-center justify-center gap-2 rounded-tool font-semibold
        transition active:translate-y-px disabled:opacity-40 disabled:active:translate-y-0
        ${btnTone[tone]} ${sizes[size]} ${full ? 'w-full' : ''} ${className}`}
    >
      {children}
    </button>
  );
}

/** A status pill (soft tint + dot). */
export function StatusChip({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${pillTone[tone]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-90" />
      {children}
    </span>
  );
}

/** A soft, bordered chip for secondary status. */
export function SoftChip({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold
      ${softTone[tone]}`}>
      {children}
    </span>
  );
}

/** A surface card. */
export function Card({ children, className = '', onClick }: {
  children: React.ReactNode; className?: string; onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-card border border-line bg-surface shadow-card ${onClick ? 'cursor-pointer transition hover:border-brandring active:translate-y-px' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

/** A large square tile button (the mechanic's field actions). */
export function TileButton({ icon, label, onClick, badge, tone = 'neutral' }: {
  icon: React.ReactNode; label: string; onClick?: () => void; badge?: number; tone?: Tone;
}) {
  return (
    <button
      onClick={onClick}
      className={`tool-tap relative flex aspect-square w-full flex-col items-center justify-center gap-2
        rounded-card border border-line bg-surface shadow-card transition hover:border-brandring active:translate-y-px`}
    >
      <span className={`flex h-14 w-14 items-center justify-center rounded-full ${softTone[tone]}`}>
        {icon}
      </span>
      <span className="text-lg font-bold tracking-tight text-ink">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="absolute right-3 top-3 flex h-7 min-w-7 items-center justify-center rounded-full
          bg-brand px-1.5 text-sm font-bold text-white">{badge}</span>
      )}
    </button>
  );
}

/** A bottom-sheet modal. */
export function Sheet({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="mt-auto rounded-t-2xl bg-surface p-5 pb-8 shadow-lift"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-line" />
        <h2 className="mb-4 text-2xl font-bold tracking-tight text-ink">{title}</h2>
        {children}
      </div>
    </div>
  );
}

/** Inline error / problem banner. */
export function ProblemBanner({ message, tone = 'stop' }: { message: string; tone?: Tone }) {
  return (
    <div className={`rounded-tool border px-4 py-3 text-sm font-semibold ${softTone[tone]}`} role="alert">
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
        className="tool-tap flex h-12 w-12 items-center justify-center rounded-tool border border-linestrong
          bg-surface text-2xl font-bold text-ink hover:bg-surface2">–</button>
      <span className="num min-w-12 text-center text-2xl font-bold">{value}</span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        className="tool-tap flex h-12 w-12 items-center justify-center rounded-tool border border-linestrong
          bg-surface text-2xl font-bold text-ink hover:bg-surface2">+</button>
    </div>
  );
}

/** Tiny inline spinner. */
export function Spinner({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-block h-5 w-5 animate-spin rounded-full border-2 border-current
      border-t-transparent ${className}`} aria-label="loading" />
  );
}
