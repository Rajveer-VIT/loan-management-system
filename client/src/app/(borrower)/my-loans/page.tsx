'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, ChevronDown, Plus } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card } from '../../../components/ui/Card';
import { StatusBadge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Skeleton } from '../../../components/ui/Skeleton';
import { Alert } from '../../../components/ui/Alert';
import { PaymentHistory } from '../../../components/dashboard/PaymentHistory';
import { useApiData } from '../../../hooks/useApi';
import { formatCurrency, formatDate, shortId } from '../../../lib/format';
import { Loan, LOAN_STATUS, Payment } from '../../../types';

const OPEN_STATUSES = [LOAN_STATUS.APPLIED, LOAN_STATUS.SANCTIONED, LOAN_STATUS.DISBURSED];

const MILESTONES: Array<{ status: LOAN_STATUS; label: string; dateOf: (l: Loan) => string | undefined }> = [
  { status: LOAN_STATUS.APPLIED, label: 'Applied', dateOf: (l) => l.appliedAt },
  { status: LOAN_STATUS.SANCTIONED, label: 'Sanctioned', dateOf: (l) => l.sanctionedAt },
  { status: LOAN_STATUS.DISBURSED, label: 'Disbursed', dateOf: (l) => l.disbursedAt },
  { status: LOAN_STATUS.CLOSED, label: 'Closed', dateOf: (l) => l.closedAt },
];

const Timeline: React.FC<{ loan: Loan }> = ({ loan }) => {
  const reachedIndex = MILESTONES.findIndex((m) => m.status === loan.status);
  return (
    <ol className="grid grid-cols-4 gap-2" aria-label="Loan progress">
      {MILESTONES.map((m, i) => {
        const done = i <= reachedIndex;
        return (
          <li key={m.status} className="text-center">
            <div className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full ${done ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
              {done ? <Check className="h-4 w-4" aria-hidden="true" /> : <span className="text-xs font-semibold">{i + 1}</span>}
            </div>
            <p className={`mt-1.5 text-xs font-medium ${done ? 'text-slate-900' : 'text-slate-400'}`}>
              {m.label}
              <span className="sr-only">{done ? ' (done)' : ' (pending)'}</span>
            </p>
            <p className="text-[11px] text-slate-500">{done ? formatDate(m.dateOf(loan)) : ''}</p>
          </li>
        );
      })}
    </ol>
  );
};

const LoanPayments: React.FC<{ loanId: string }> = ({ loanId }) => {
  const { data, error, isLoading } = useApiData<{ loan: Loan; payments: Payment[] }>(`/borrower/loans/${loanId}`);
  if (error) return <Alert tone="danger">{error}</Alert>;
  if (isLoading || !data) return <Skeleton className="h-20 w-full" />;
  return <PaymentHistory payments={data.payments} showRecordedBy={false} />;
};

const LoanCard: React.FC<{ loan: Loan }> = ({ loan }) => {
  const [showPayments, setShowPayments] = useState(false);
  const isRepaying = loan.status === LOAN_STATUS.DISBURSED || loan.status === LOAN_STATUS.CLOSED;
  const pct = loan.totalRepayment > 0 ? Math.min(100, (loan.totalPaid / loan.totalRepayment) * 100) : 0;

  if (loan.status === LOAN_STATUS.DRAFT) {
    return (
      <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <StatusBadge status={loan.status} />
            <span className="text-xs text-slate-500">Started {formatDate(loan.createdAt)}</span>
          </div>
          <p className="mt-2 text-sm text-slate-600">Your application isn&apos;t submitted yet. Pick up where you left off.</p>
        </div>
        <Link href="/apply/personal-details">
          <Button size="sm">
            Continue application <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </Link>
      </Card>
    );
  }

  return (
    <Card as="article" aria-label={`Loan ${shortId(loan._id)}`} className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <StatusBadge status={loan.status} />
            <span className="text-xs text-slate-500">Loan {shortId(loan._id)}</span>
          </div>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">{formatCurrency(loan.amount)}</p>
          <p className="text-sm text-slate-500">
            {loan.tenureDays} days at {loan.interestRate}% p.a. · interest {formatCurrency(loan.simpleInterest)}
          </p>
        </div>
        <div className="sm:text-right">
          <p className="text-xs text-slate-500">Total repayment</p>
          <p className="text-lg font-semibold tabular-nums text-slate-900">{formatCurrency(loan.totalRepayment)}</p>
        </div>
      </div>

      {loan.status === LOAN_STATUS.REJECTED ? (
        <Alert tone="danger" title={`Application rejected on ${formatDate(loan.rejectedAt)}`}>
          {loan.rejectionReason}
        </Alert>
      ) : (
        <Timeline loan={loan} />
      )}

      {isRepaying && (
        <div className="space-y-2 rounded-lg bg-slate-50 p-4">
          <div className="flex flex-wrap justify-between gap-2 text-sm">
            <span className="text-slate-600">
              Paid <strong className="tabular-nums text-slate-900">{formatCurrency(loan.totalPaid)}</strong>
            </span>
            <span className="text-slate-600">
              Outstanding <strong className="tabular-nums text-slate-900">{formatCurrency(loan.outstandingBalance)}</strong>
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-label="Repaid" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
          </div>
          <button
            type="button"
            aria-expanded={showPayments}
            onClick={() => setShowPayments((v) => !v)}
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline"
          >
            {showPayments ? 'Hide payments' : 'Show payments'}
            <ChevronDown className={`h-4 w-4 transition-transform ${showPayments ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
          {showPayments && <LoanPayments loanId={loan._id} />}
        </div>
      )}
    </Card>
  );
};

export default function MyLoansPage() {
  const { data: loans, error, isLoading } = useApiData<Loan[]>('/borrower/loans');
  const hasOpenOrDraft = loans?.some((l) => l.status === LOAN_STATUS.DRAFT || OPEN_STATUSES.includes(l.status)) ?? true;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My loans"
        description="Track your applications and repayments."
        action={
          !hasOpenOrDraft && (
            <Link href="/apply/personal-details">
              <Button>
                <Plus className="h-4 w-4" aria-hidden="true" /> New application
              </Button>
            </Link>
          )
        }
      />

      {error && <Alert tone="danger">{error}</Alert>}
      {isLoading && !loans ? (
        <div className="space-y-4">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      ) : loans && loans.length === 0 ? (
        <EmptyState
          title="No applications yet"
          description="Apply for a personal loan of ₹50,000 to ₹5,00,000 in three short steps."
          action={
            <Link href="/apply/personal-details">
              <Button>Start application</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">{loans?.map((loan) => <LoanCard key={loan._id} loan={loan} />)}</div>
      )}
    </div>
  );
}
