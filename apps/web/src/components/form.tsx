'use client';

import React from 'react';

/*
 * Shared form primitives for every data-entry screen (create/edit customer and
 * vehicle, the line editor, owner/portal forms). One design language: light
 * fields, quiet uppercase labels, a soft brand focus ring, generous tap
 * targets. Updating these updates every form across the product at once.
 */

const FIELD =
  'min-h-tap w-full rounded-tool border border-linestrong bg-surface px-3 text-base text-ink transition ' +
  'placeholder:text-muted2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brandring';
const LABEL = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted2';
const HINT = 'mt-1 block text-xs text-muted';

export function TextField({
  label, value, onChange, placeholder, type = 'text', required, hint, mono, uppercase,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
  type?: string; required?: boolean; hint?: string; mono?: boolean; uppercase?: boolean;
}) {
  return (
    <label className="block">
      <span className={LABEL}>{label}{required && <span className="text-stop"> *</span>}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(uppercase ? e.target.value.toUpperCase() : e.target.value)}
        className={`${FIELD} ${mono ? 'num' : ''}`}
      />
      {hint && <span className={HINT}>{hint}</span>}
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
      <span className={LABEL}>{label}{required && <span className="text-stop"> *</span>}</span>
      <input
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.'))}
        className={`${FIELD} num text-right`}
      />
      {hint && <span className={HINT}>{hint}</span>}
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
      <span className={LABEL}>{label}{required && <span className="text-stop"> *</span>}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={FIELD}>
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
      <span className={LABEL}>{label}</span>
      <textarea
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`${FIELD} py-2.5 leading-relaxed`}
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
    <label className="flex cursor-pointer items-start gap-3 rounded-tool border border-linestrong bg-surface p-3 transition hover:border-brandring">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-5 w-5 accent-brand"
      />
      <span>
        <span className="block font-semibold text-ink">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
    </label>
  );
}

/** EU/EEA + Western Balkans country options that match A-SPRINT's customer mix. */
export const COUNTRY_OPTIONS = [
  'SI', 'HR', 'DE', 'PL', 'BA', 'RS', 'AT', 'HU', 'SK', 'NL', 'IT', 'CZ', 'RO', 'BG', 'FR', 'BE',
].map((c) => ({ value: c, label: c }));
