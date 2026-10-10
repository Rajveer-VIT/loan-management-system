import React from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, description, action, icon }) => (
  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500" aria-hidden="true">
      {icon ?? <Inbox className="h-6 w-6" />}
    </div>
    <h3 className="text-base font-semibold text-slate-900">{title}</h3>
    {description && <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);
