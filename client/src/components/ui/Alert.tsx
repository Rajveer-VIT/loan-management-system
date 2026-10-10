import React from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';

type Tone = 'info' | 'success' | 'warning' | 'danger';

const STYLES: Record<Tone, { box: string; icon: React.ElementType }> = {
  info: { box: 'border-sky-200 bg-sky-50 text-sky-900', icon: Info },
  success: { box: 'border-emerald-200 bg-emerald-50 text-emerald-900', icon: CheckCircle2 },
  warning: { box: 'border-amber-200 bg-amber-50 text-amber-900', icon: AlertTriangle },
  danger: { box: 'border-rose-200 bg-rose-50 text-rose-900', icon: XCircle },
};

interface AlertProps {
  tone?: Tone;
  title?: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}

export const Alert: React.FC<AlertProps> = ({ tone = 'info', title, children, action }) => {
  const { box, icon: Icon } = STYLES[tone];
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={`flex gap-3 rounded-xl border p-4 text-sm ${box}`}>
      <Icon className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1 space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="leading-relaxed">{children}</div>}
        {action && <div className="pt-2">{action}</div>}
      </div>
    </div>
  );
};
