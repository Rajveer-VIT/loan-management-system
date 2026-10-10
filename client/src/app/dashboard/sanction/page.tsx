'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { CalendarCheck, CalendarX, FileClock, IndianRupee } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { StatCard } from '../../../components/dashboard/StatCard';
import { LoanDetailsModal } from '../../../components/dashboard/LoanDetailsModal';
import { RejectModal } from '../../../components/dashboard/RejectModal';
import { SalarySlipButton } from '../../../components/dashboard/LoanDetails';
import { Column, Table } from '../../../components/ui/Table';
import { Button } from '../../../components/ui/Button';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { SearchInput } from '../../../components/ui/SearchInput';
import { Pagination } from '../../../components/ui/Pagination';
import { Alert } from '../../../components/ui/Alert';
import { useApiData, usePaginatedList } from '../../../hooks/useApi';
import { api, getApiError } from '../../../lib/api';
import { formatCurrency, formatDateTime, maskPan } from '../../../lib/format';
import { Loan, SanctionStats } from '../../../types';

export default function SanctionDashboardPage() {
  const stats = useApiData<SanctionStats>('/sanction/stats');
  const list = usePaginatedList<Loan>('/sanction/loans');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [approveLoan, setApproveLoan] = useState<Loan | null>(null);
  const [rejectLoan, setRejectLoan] = useState<Loan | null>(null);

  const refresh = () => {
    list.reload();
    stats.reload();
  };

  const handleApprove = async () => {
    if (!approveLoan) return;
    try {
      await api.patch(`/sanction/loans/${approveLoan._id}/approve`);
      toast.success(`Sanctioned ${formatCurrency(approveLoan.amount)} for ${approveLoan.personalDetails?.fullName}`);
      setApproveLoan(null);
      setDetailId(null);
    } catch (err) {
      toast.error(getApiError(err, 'Could not approve the application').message);
    } finally {
      refresh(); // the queue may have changed even if our action failed (409)
    }
  };

  const handleReject = async (reason: string) => {
    if (!rejectLoan) return;
    try {
      await api.patch(`/sanction/loans/${rejectLoan._id}/reject`, { rejectionReason: reason });
      toast.success(`Application from ${rejectLoan.personalDetails?.fullName} rejected`);
      setDetailId(null);
    } finally {
      refresh();
    }
  };

  const decisionButtons = (loan: Loan) => (
    <>
      <Button
        variant="outline"
        size="sm"
        className="text-rose-700"
        onClick={() => {
          setDetailId(null);
          setRejectLoan(loan);
        }}
      >
        Reject
      </Button>
      <Button
        variant="success"
        size="sm"
        onClick={() => {
          setDetailId(null);
          setApproveLoan(loan);
        }}
      >
        Approve
      </Button>
    </>
  );

  const columns: Column<Loan>[] = [
    {
      header: 'Applicant',
      cell: (loan) => (
        <div>
          <button
            type="button"
            onClick={() => setDetailId(loan._id)}
            className="text-left font-medium text-brand-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            {loan.personalDetails?.fullName ?? 'Applicant'}
          </button>
          <p className="font-mono text-xs text-slate-500">{maskPan(loan.personalDetails?.pan)}</p>
        </div>
      ),
    },
    {
      header: 'Requested',
      cell: (loan) => (
        <div>
          <p className="font-medium text-slate-900 tabular-nums">{formatCurrency(loan.amount)}</p>
          <p className="text-xs text-slate-500">{loan.tenureDays} days · repay {formatCurrency(loan.totalRepayment)}</p>
        </div>
      ),
    },
    {
      header: 'Monthly salary',
      cell: (loan) => <span className="tabular-nums">{formatCurrency(loan.personalDetails?.monthlySalary)}</span>,
      hideOnMobile: true,
    },
    { header: 'Salary slip', cell: (loan) => <SalarySlipButton loan={loan} />, hideOnMobile: true },
    { header: 'Applied', cell: (loan) => formatDateTime(loan.appliedAt ?? loan.updatedAt), hideOnMobile: true },
    { header: 'Decision', cell: (loan) => <div className="flex flex-wrap gap-2">{decisionButtons(loan)}</div> },
  ];

  const s = stats.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sanction — application review"
        description="Review applications in the order they arrived. Approve to sanction, or reject with a reason the borrower will see."
      />

      {stats.error && <Alert tone="danger">{stats.error}</Alert>}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard title="Awaiting review" value={s ? s.pendingCount : null} icon={<FileClock className="h-4 w-4" />} />
        <StatCard title="Amount requested" value={s ? formatCurrency(s.totalPendingAmount) : null} icon={<IndianRupee className="h-4 w-4" />} />
        <StatCard title="Sanctioned today" value={s ? s.sanctionedToday : null} icon={<CalendarCheck className="h-4 w-4" />} />
        <StatCard title="Rejected today" value={s ? s.rejectedToday : null} icon={<CalendarX className="h-4 w-4" />} />
      </div>

      <div className="flex justify-end">
        <SearchInput value={list.search} onChange={list.setSearch} label="Search applications" placeholder="Search by name or PAN" />
      </div>

      {list.error && <Alert tone="danger">{list.error}</Alert>}
      <Table
        caption="Applications awaiting sanction"
        columns={columns}
        data={list.items}
        getRowKey={(loan) => loan._id}
        isLoading={list.isLoading}
        emptyState={list.search ? 'No applications match your search.' : 'No applications are waiting for review.'}
      />
      <Pagination meta={list.meta} onPageChange={list.setPage} label="applications" />

      <LoanDetailsModal
        detailPath={detailId ? `/sanction/loans/${detailId}` : null}
        onClose={() => setDetailId(null)}
        actions={decisionButtons}
      />

      <ConfirmDialog
        isOpen={approveLoan !== null}
        title="Approve and sanction this loan?"
        confirmLabel="Approve loan"
        variant="success"
        onConfirm={handleApprove}
        onClose={() => setApproveLoan(null)}
      >
        {approveLoan && (
          <p>
            <strong className="text-slate-900">{approveLoan.personalDetails?.fullName}</strong> will be sanctioned{' '}
            <strong className="text-slate-900">{formatCurrency(approveLoan.amount)}</strong> for {approveLoan.tenureDays} days (total
            repayment {formatCurrency(approveLoan.totalRepayment)}). The loan moves to the Disbursement queue.
          </p>
        )}
      </ConfirmDialog>

      <RejectModal
        isOpen={rejectLoan !== null}
        applicantName={rejectLoan?.personalDetails?.fullName ?? 'Applicant'}
        onClose={() => setRejectLoan(null)}
        onConfirm={handleReject}
      />
    </div>
  );
}
