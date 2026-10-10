import React from 'react';
import { Skeleton } from '../ui/Skeleton';

interface StatCardProps {
  title: string;
  value: string | number | null;
  description?: string;
  icon?: React.ReactNode;
}

/** A KPI tile; `value === null` renders a loading placeholder. */
export const StatCard: React.FC<StatCardProps> = ({ title, value, description, icon }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      {icon && (
        <span className="rounded-lg bg-slate-100 p-2 text-slate-600" aria-hidden="true">
          {icon}
        </span>
      )}
    </div>
    <div className="mt-2">
      {value === null ? (
        <Skeleton className="h-8 w-28" />
      ) : (
        <p className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">{value}</p>
      )}
      {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
    </div>
  </div>
);
