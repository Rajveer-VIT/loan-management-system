import React from 'react';
import { LOAN_STATUS } from '../../types';

export type BadgeTone = 'neutral' | 'info' | 'warning' | 'success' | 'danger' | 'brand';

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
  info: 'bg-sky-50 text-sky-700 ring-sky-200',
  warning: 'bg-amber-50 text-amber-800 ring-amber-200',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  danger: 'bg-rose-50 text-rose-700 ring-rose-200',
  brand: 'bg-brand-50 text-brand-700 ring-brand-200',
};

export const STATUS_META: Record<LOAN_STATUS, { label: string; tone: BadgeTone }> = {
  [LOAN_STATUS.DRAFT]: { label: 'Draft', tone: 'neutral' },
  [LOAN_STATUS.APPLIED]: { label: 'Applied', tone: 'warning' },
  [LOAN_STATUS.SANCTIONED]: { label: 'Sanctioned', tone: 'brand' },
  [LOAN_STATUS.DISBURSED]: { label: 'Disbursed', tone: 'info' },
  [LOAN_STATUS.CLOSED]: { label: 'Closed', tone: 'success' },
  [LOAN_STATUS.REJECTED]: { label: 'Rejected', tone: 'danger' },
};

interface BadgeProps {
  tone?: BadgeTone;
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ tone = 'neutral', children }) => (
  <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${TONES[tone]}`}>
    {children}
  </span>
);

export const StatusBadge: React.FC<{ status: LOAN_STATUS }> = ({ status }) => {
  const meta = STATUS_META[status] ?? { label: status, tone: 'neutral' as const };
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
};
