'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Banknote, CalendarCheck, Hourglass, IndianRupee } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { StatCard } from '../../../components/dashboard/StatCard';
import { LoanDetailsModal } from '../../../components/dashboard/LoanDetailsModal';
import { actorName } from '../../../components/dashboard/LoanDetails';
import { Column, Table } from '../../../components/ui/Table';
import { Button } from '../../../components/ui/Button';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { SearchInput } from '../../../components/ui/SearchInput';
import { Pagination } from '../../../components/ui/Pagination';
import { Alert } from '../../../components/ui/Alert';
import { useApiData, usePaginatedList } from '../../../hooks/useApi';
import { api, getApiError } from '../../../lib/api';
import { formatCurrency, formatDateTime, maskPan } from '../../../lib/format';
import { DisbursementStats, Loan } from '../../../types';

export default function DisbursementDashboardPage() {
  const stats = useApiData<DisbursementStats>('/disbursement/stats');
  const list = usePaginatedList<Loan>('/disbursement/loans');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [disburseLoan, setDisburseLoan] = useState<Loan | null>(null);

  const handleDisburse = async () => {
    if (!disburseLoan) return;
    try {
      await api.patch(`/disbursement/loans/${disburseLoan._id}/disburse`);
      toast.success(`${formatCurrency(disburseLoan.amount)} disbursed to ${disburseLoan.personalDetails?.fullName}`);
      setDisburseLoan(null);
    } catch (err) {
      toast.error(getApiError(err, 'Could not disburse the loan').message);
    } finally {
      list.reload();
      stats.reload();
    }
  };

  const disburseButton = (loan: Loan) => (
    <Button
      size="sm"
      onClick={() => {
        setDetailId(null);
        setDisburseLoan(loan);
      }}
    >
      <Banknote className="h-4 w-4" aria-hidden="true" /> Disburse
    </Button>
  );

  const columns: Column<Loan>[] = [
    {
      header: 'Borrower',
      cell: (loan) => (
        <div>
          <button
            type="button"
            onClick={() => setDetailId(loan._id)}
            className="text-left font-medium text-brand-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            {loan.personalDetails?.fullName ?? 'Borrower'}
          </button>
          <p className="font-mono text-xs text-slate-500">{maskPan(loan.personalDetails?.pan)}</p>
        </div>
      ),
    },
    {
      header: 'Sanctioned amount',
      cell: (loan) => (
        <div>
          <p className="font-medium text-slate-900 tabular-nums">{formatCurrency(loan.amount)}</p>
          <p className="text-xs text-slate-500">{loan.tenureDays} days</p>
        </div>
      ),
    },
    {
      header: 'Total repayment',
      cell: (loan) => <span className="tabular-nums">{formatCurrency(loan.totalRepayment)}</span>,
      hideOnMobile: true,
    },
    {
      header: 'Sanctioned',
      cell: (loan) => (
        <div>
          <p>{formatDateTime(loan.sanctionedAt)}</p>
          {actorName(loan.sanctionedBy) && <p className="text-xs text-slate-500">by {actorName(loan.sanctionedBy)}</p>}
        </div>
      ),
      hideOnMobile: true,
    },
    { header: 'Action', cell: disburseButton },
  ];

  const s = stats.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Disbursement — payout queue"
        description="Sanctioned loans awaiting release of funds. Marking a loan as disbursed starts repayment tracking in Collection."
      />

      {stats.error && <Alert tone="danger">{stats.error}</Alert>}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard title="Awaiting payout" value={s ? s.pendingCount : null} icon={<Hourglass className="h-4 w-4" />} />
        <StatCard title="Amount to disburse" value={s ? formatCurrency(s.totalPendingAmount) : null} icon={<IndianRupee className="h-4 w-4" />} />
        <StatCard title="Disbursed today" value={s ? s.disbursedTodayCount : null} icon={<CalendarCheck className="h-4 w-4" />} />
        <StatCard title="Amount disbursed today" value={s ? formatCurrency(s.disbursedTodayAmount) : null} icon={<Banknote className="h-4 w-4" />} />
      </div>

      <div className="flex justify-end">
        <SearchInput value={list.search} onChange={list.setSearch} label="Search sanctioned loans" placeholder="Search by name or PAN" />
      </div>

      {list.error && <Alert tone="danger">{list.error}</Alert>}
      <Table
        caption="Sanctioned loans awaiting disbursement"
        columns={columns}
        data={list.items}
        getRowKey={(loan) => loan._id}
        isLoading={list.isLoading}
        emptyState={list.search ? 'No loans match your search.' : 'No sanctioned loans are waiting for disbursement.'}
      />
      <Pagination meta={list.meta} onPageChange={list.setPage} label="loans" />

      <LoanDetailsModal detailPath={detailId ? `/disbursement/loans/${detailId}` : null} onClose={() => setDetailId(null)} actions={disburseButton} />

      <ConfirmDialog
        isOpen={disburseLoan !== null}
        title="Confirm disbursement"
        confirmLabel="Mark as disbursed"
        onConfirm={handleDisburse}
        onClose={() => setDisburseLoan(null)}
      >
        {disburseLoan && (
          <div className="space-y-3">
            <p>
              Confirm that <strong className="text-slate-900">{formatCurrency(disburseLoan.amount)}</strong> has been released to{' '}
              <strong className="text-slate-900">{disburseLoan.personalDetails?.fullName}</strong>.
            </p>
            <p>
              The loan will move to <strong className="text-slate-900">Disbursed</strong> and the borrower will owe{' '}
              {formatCurrency(disburseLoan.totalRepayment)}. This cannot be undone.
            </p>
          </div>
        )}
      </ConfirmDialog>
    </div>
  );
}
