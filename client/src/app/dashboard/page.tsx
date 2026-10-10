'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, CreditCard, FileCheck2, Receipt, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { homePathFor } from '../../lib/access';
import { useApiData } from '../../hooks/useApi';
import { formatCurrency } from '../../lib/format';
import { PageHeader } from '../../components/layout/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { CollectionStats, DisbursementStats, ROLES, SalesStats, SanctionStats } from '../../types';

interface ModuleCardProps {
  href: string;
  title: string;
  icon: React.ElementType;
  headline: string | null;
  detail: string | null;
  error: string | null;
}

const ModuleCard: React.FC<ModuleCardProps> = ({ href, title, icon: Icon, headline, detail, error }) => (
  <Link
    href={href}
    className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-300 hover:shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
  >
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <Icon className="h-4 w-4 text-brand-600" aria-hidden="true" /> {title}
      </span>
      <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-brand-600" aria-hidden="true" />
    </div>
    <div className="mt-4">
      {error ? (
        <p className="text-sm text-rose-600">{error}</p>
      ) : headline === null ? (
        <>
          <Skeleton className="h-7 w-24" />
          <Skeleton className="mt-2 h-4 w-40" />
        </>
      ) : (
        <>
          <p className="text-2xl font-semibold text-slate-900 tabular-nums">{headline}</p>
          <p className="mt-1 text-sm text-slate-500">{detail}</p>
        </>
      )}
    </div>
  </Link>
);

/** Admin overview of all four modules; every other staff role is sent to its own module. */
export default function DashboardIndexPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === ROLES.ADMIN;

  useEffect(() => {
    if (user && !isAdmin) router.replace(homePathFor(user.role));
  }, [user, isAdmin, router]);

  const sales = useApiData<SalesStats>(isAdmin ? '/sales/stats' : null);
  const sanction = useApiData<SanctionStats>(isAdmin ? '/sanction/stats' : null);
  const disbursement = useApiData<DisbursementStats>(isAdmin ? '/disbursement/stats' : null);
  const collection = useApiData<CollectionStats>(isAdmin ? '/collection/stats' : null);

  if (!isAdmin) return null;

  return (
    <div className="space-y-6">
      <PageHeader title="Operations overview" description="Live queue sizes across the loan lifecycle. Select a module to work its queue." />
      <div className="grid gap-4 sm:grid-cols-2">
        <ModuleCard
          href="/dashboard/sales"
          title="Sales — leads"
          icon={Users}
          error={sales.error}
          headline={sales.data ? `${sales.data.totalLeads} leads` : null}
          detail={sales.data ? `${sales.data.funnel.SLIP_UPLOADED} ready to apply · ${sales.data.newLeadsToday} new today` : null}
        />
        <ModuleCard
          href="/dashboard/sanction"
          title="Sanction — awaiting review"
          icon={FileCheck2}
          error={sanction.error}
          headline={sanction.data ? `${sanction.data.pendingCount} applications` : null}
          detail={sanction.data ? `${formatCurrency(sanction.data.totalPendingAmount)} requested` : null}
        />
        <ModuleCard
          href="/dashboard/disbursement"
          title="Disbursement — awaiting payout"
          icon={CreditCard}
          error={disbursement.error}
          headline={disbursement.data ? `${disbursement.data.pendingCount} loans` : null}
          detail={disbursement.data ? `${formatCurrency(disbursement.data.totalPendingAmount)} to disburse` : null}
        />
        <ModuleCard
          href="/dashboard/collection"
          title="Collection — active loans"
          icon={Receipt}
          error={collection.error}
          headline={collection.data ? `${collection.data.activeDisbursedCount} active` : null}
          detail={collection.data ? `${formatCurrency(collection.data.totalOutstanding)} outstanding · ${collection.data.closedCount} closed` : null}
        />
      </div>
    </div>
  );
}
