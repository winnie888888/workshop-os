'use client';

import React from 'react';

/*
 * Shared form primitives for the advisor's data-entry screens (create/edit
 * customer and vehicle, the line editor). They carry the same industrial look
 * as the rest of the UI — large targets, heavy labels, clear focus — so every
 * form in the desk feels like one tool rather than a patchwork.
 */

export function TextField({
  label, value, onChange, placeholder, type = 'text', required, hint, mono, uppercase,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
  type?: string; required?: boolean; hint?: string; mono?: boolean; uppercase?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-steel">
        {label}{required && <span className="text-stop"> *</span>}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(uppercase ? e.target.value.toUpperCase() : e.target.value)}
        className={`min-h-tap w-full rounded-tool border-2 border-line bg-panel px-3 text-tap
          focus:border-info focus:outline-none ${mono ? 'font-mono' : ''}`}
      />
      {hint && <span className="mt-1 block text-xs text-steel">{hint}</span>}
    </label>
  );
}

export function NumberField({
  label, value, onChange, required, hint, min,
}: {
  label: string; value: string; onChange: (v: string) => void; required?: boolean; hint?: string; min?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-steel">
        {label}{required && <span className="text-stop"> *</span>}
      </span>
      <input
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.'))}
        className="min-h-tap w-full rounded-tool border-2 border-line bg-panel px-3 text-tap font-mono
          focus:border-info focus:outline-none"
      />
      {hint && <span className="mt-1 block text-xs text-steel">{hint}</span>}
    </label>
  );
}

export function SelectField({
  label, value, onChange, options, required,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-steel">
        {label}{required && <span className="text-stop"> *</span>}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-tap w-full rounded-tool border-2 border-line bg-panel px-3 text-tap
          focus:border-info focus:outline-none"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

export function TextAreaField({
  label, value, onChange, placeholder, rows = 3,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-steel">{label}</span>
      <textarea
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-tool border-2 border-line bg-panel p-3 text-base focus:border-info focus:outline-none"
      />
    </label>
  );
}

export function CheckboxField({
  label, checked, onChange, hint,
}: {
  label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-tool border-2 border-line bg-panel p-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-5 w-5 accent-info"
      />
      <span>
        <span className="block font-semibold">{label}</span>
        {hint && <span className="block text-xs text-steel">{hint}</span>}
      </span>
    </label>
  );
}

/** EU/EEA + Western Balkans country options that match A-SPRINT's customer mix. */
export const COUNTRY_OPTIONS = [
  'SI', 'HR', 'DE', 'PL', 'BA', 'RS', 'AT', 'HU', 'SK', 'NL', 'IT', 'CZ', 'RO', 'BG', 'FR', 'BE',
].map((c) => ({ value: c, label: c }));
