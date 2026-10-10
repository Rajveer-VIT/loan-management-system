'use client';

import React, { useState } from 'react';
import { CheckCircle2, CircleDollarSign, Receipt, Wallet } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { StatCard } from '../../../components/dashboard/StatCard';
import { LoanDetails } from '../../../components/dashboard/LoanDetails';
import { PaymentForm } from '../../../components/dashboard/PaymentForm';
import { PaymentHistory } from '../../../components/dashboard/PaymentHistory';
import { Column, Table } from '../../../components/ui/Table';
import { Button } from '../../../components/ui/Button';
import { StatusBadge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { SearchInput } from '../../../components/ui/SearchInput';
import { Pagination } from '../../../components/ui/Pagination';
import { Alert } from '../../../components/ui/Alert';
import { Skeleton } from '../../../components/ui/Skeleton';
import { useApiData, usePaginatedList } from '../../../hooks/useApi';
import { formatCurrency, maskPan } from '../../../lib/format';
import { CollectionStats, Loan, LOAN_STATUS, Payment } from '../../../types';

type StatusFilter = 'DISBURSED' | 'CLOSED' | 'ALL';

const TABS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'DISBURSED', label: 'Active' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'ALL', label: 'All' },
];

const RepaymentProgress: React.FC<{ loan: Loan }> = ({ loan }) => {
  const pct = loan.totalRepayment > 0 ? Math.min(100, (loan.totalPaid / loan.totalRepayment) * 100) : 0;
  return (
    <div className="min-w-[8rem]">
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Repaid"
      >
        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-xs text-slate-500">{Math.floor(pct)}% repaid</p>
    </div>
  );
};

function RepaymentModal({ loanId, onClose, onChanged }: { loanId: string | null; onClose: () => void; onChanged: () => void }) {
  const { data, error, isLoading, reload } = useApiData<{ loan: Loan; payments: Payment[] }>(loanId ? `/collection/loans/${loanId}` : null);
  const loan = data?.loan;

  return (
    <Modal isOpen={loanId !== null} onClose={onClose} title="Repayments" size="lg">
      {error ? (
        <Alert tone="danger">{error}</Alert>
      ) : isLoading && !data ? (
        <Skeleton className="h-48 w-full" />
      ) : loan && data ? (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-3 rounded-xl border border-slate-200 p-4 text-center">
            <div>
              <p className="text-xs text-slate-500">Total due</p>
              <p className="font-semibold tabular-nums text-slate-900">{formatCurrency(loan.totalRepayment)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Paid</p>
              <p className="font-semibold tabular-nums text-emerald-700">{formatCurrency(loan.totalPaid)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Outstanding</p>
              <p className="font-semibold tabular-nums text-slate-900">{formatCurrency(loan.outstandingBalance)}</p>
            </div>
          </div>

          {loan.status === LOAN_STATUS.DISBURSED ? (
            <PaymentForm
              loanId={loan._id}
              outstandingBalance={loan.outstandingBalance}
              disbursedAt={loan.disbursedAt}
              onRecorded={() => {
                reload();
                onChanged();
              }}
            />
          ) : (
            <Alert tone="success" title="Loan closed">
              Fully repaid — no further payments can be recorded.
            </Alert>
          )}

          <PaymentHistory payments={data.payments} />
          <details className="rounded-lg border border-slate-200 p-4">
            <summary className="cursor-pointer text-sm font-semibold text-slate-900">Loan details & audit trail</summary>
            <div className="mt-4">
              <LoanDetails loan={loan} showSlip={false} />
            </div>
          </details>
        </div>
      ) : null}
    </Modal>
  );
}

export default function CollectionDashboardPage() {
  const [status, setStatus] = useState<StatusFilter>('DISBURSED');
  const stats = useApiData<CollectionStats>('/collection/stats');
  const list = usePaginatedList<Loan>('/collection/loans', { status });
  const [activeLoanId, setActiveLoanId] = useState<string | null>(null);

  const columns: Column<Loan>[] = [
    {
      header: 'Borrower',
      cell: (loan) => (
        <div>
          <p className="font-medium text-slate-900">{loan.personalDetails?.fullName ?? 'Borrower'}</p>
          <p className="font-mono text-xs text-slate-500">{maskPan(loan.personalDetails?.pan)}</p>
        </div>
      ),
    },
    { header: 'Status', cell: (loan) => <StatusBadge status={loan.status} />, hideOnMobile: true },
    { header: 'Total due', cell: (loan) => <span className="tabular-nums">{formatCurrency(loan.totalRepayment)}</span>, hideOnMobile: true },
    {
      header: 'Outstanding',
      cell: (loan) => (
        <div className="space-y-1">
          <p className="font-medium tabular-nums text-slate-900">{formatCurrency(loan.outstandingBalance)}</p>
          <RepaymentProgress loan={loan} />
        </div>
      ),
    },
    {
      header: 'Action',
      cell: (loan) => (
        <Button size="sm" variant={loan.status === LOAN_STATUS.CLOSED ? 'outline' : 'primary'} onClick={() => setActiveLoanId(loan._id)}>
          <Receipt className="h-4 w-4" aria-hidden="true" />
          {loan.status === LOAN_STATUS.CLOSED ? 'View' : 'Record payment'}
        </Button>
      ),
    },
  ];

  const s = stats.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Collection — repayments"
        description="Record borrower payments against disbursed loans. A loan closes automatically when its outstanding balance reaches zero."
      />

      {stats.error && <Alert tone="danger">{stats.error}</Alert>}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard title="Active loans" value={s ? s.activeDisbursedCount : null} icon={<Wallet className="h-4 w-4" />} />
        <StatCard title="Outstanding" value={s ? formatCurrency(s.totalOutstanding) : null} icon={<CircleDollarSign className="h-4 w-4" />} />
        <StatCard title="Collected to date" value={s ? formatCurrency(s.totalCollected) : null} icon={<Receipt className="h-4 w-4" />} />
        <StatCard title="Closed loans" value={s ? s.closedCount : null} icon={<CheckCircle2 className="h-4 w-4" />} />
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div role="tablist" aria-label="Loan status" className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={status === tab.value}
              onClick={() => setStatus(tab.value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                status === tab.value ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <SearchInput value={list.search} onChange={list.setSearch} label="Search loans" placeholder="Search by name or PAN" />
      </div>

      {list.error && <Alert tone="danger">{list.error}</Alert>}
      <Table
        caption="Loans in collection"
        columns={columns}
        data={list.items}
        getRowKey={(loan) => loan._id}
        isLoading={list.isLoading}
        emptyState={list.search ? 'No loans match your search.' : status === 'CLOSED' ? 'No closed loans yet.' : 'No active loans to collect.'}
      />
      <Pagination meta={list.meta} onPageChange={list.setPage} label="loans" />

      <RepaymentModal
        loanId={activeLoanId}
        onClose={() => setActiveLoanId(null)}
        onChanged={() => {
          list.reload();
          stats.reload();
        }}
      />
    </div>
  );
}
