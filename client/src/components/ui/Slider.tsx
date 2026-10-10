'use client';

import React, { useEffect, useId, useState } from 'react';
import { clamp } from '../../lib/loanCalculator';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (val: number) => void;
  /** Formats values for display and screen readers (e.g. "₹1,00,000", "180 days"). */
  format: (val: number) => string;
  unitLabel?: string;
}

/**
 * Range slider paired with a numeric box. Typing is free-form, but the committed value is
 * always a whole number clamped to [min, max], so the live calculation can never show a
 * figure the server would reject.
 */
export const Slider: React.FC<SliderProps> = ({ label, value, min, max, step, onChange, format, unitLabel }) => {
  const id = useId();
  const [draft, setDraft] = useState(String(value));

  useEffect(() => setDraft(String(value)), [value]);

  const commit = (raw: string) => {
    const n = Math.round(Number(raw));
    const next = Number.isFinite(n) && raw.trim() !== '' ? clamp(n, min, max) : value;
    onChange(next);
    setDraft(String(next));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={`${id}-range`} className="text-sm font-medium text-slate-700">
          {label}
        </label>
        <div className="flex items-center rounded-lg border border-slate-300 bg-white focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
          <input
            id={`${id}-number`}
            type="number"
            inputMode="numeric"
            min={min}
            max={max}
            step={1}
            value={draft}
            aria-label={`${label}${unitLabel ? ` in ${unitLabel}` : ''}`}
            onChange={(e) => {
              setDraft(e.target.value);
              const n = Number(e.target.value);
              if (Number.isInteger(n) && n >= min && n <= max) onChange(n);
            }}
            onBlur={(e) => commit(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && commit((e.target as HTMLInputElement).value)}
            className="w-28 rounded-lg bg-transparent px-2.5 py-1.5 text-right text-sm font-semibold tabular-nums text-slate-900 focus:outline-none"
          />
          {unitLabel && <span className="pr-2.5 text-xs text-slate-500">{unitLabel}</span>}
        </div>
      </div>
      <input
        id={`${id}-range`}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={format(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-brand-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
      />
      <div className="flex justify-between text-xs text-slate-500">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
};
