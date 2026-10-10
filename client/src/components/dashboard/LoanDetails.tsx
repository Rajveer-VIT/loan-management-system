'use client';

import React, { useState } from 'react';
import { FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Loan, UserSummary } from '../../types';
import { formatCalendarDate, formatCurrency, formatDateTime, formatFileSize, shortId } from '../../lib/format';
import { getApiError, openProtectedFile } from '../../lib/api';
import { StatusBadge, STATUS_META } from '../ui/Badge';
import { Button } from '../ui/Button';

const EMPLOYMENT_LABELS: Record<string, string> = {
  SALARIED: 'Salaried',
  SELF_EMPLOYED: 'Self-employed',
  UNEMPLOYED: 'Unemployed',
};

export function actorName(ref?: string | UserSummary): string | undefined {
  return typeof ref === 'object' && ref ? ref.name : undefined;
}

export function borrowerOf(loan: Loan): UserSummary | null {
  return typeof loan.borrower === 'object' ? loan.borrower : null;
}

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex justify-between gap-4 py-1.5 text-sm">
    <dt className="text-slate-500">{label}</dt>
    <dd className="text-right font-medium text-slate-900">{children}</dd>
  </div>
);

export const SalarySlipButton: React.FC<{ loan: Loan; size?: 'sm' | 'md' }> = ({ loan, size = 'sm' }) => {
  const [isOpening, setIsOpening] = useState(false);
  if (!loan.salarySlip) return <span className="text-xs text-slate-400">Not uploaded</span>;

  const open = async () => {
    setIsOpening(true);
    try {
      await openProtectedFile(`/loans/${loan._id}/salary-slip`);
    } catch (err) {
      toast.error(getApiError(err, 'Could not open the salary slip').message);
    } finally {
      setIsOpening(false);
    }
  };

  return (
    <Button variant="outline" size={size} onClick={open} isLoading={isOpening} loadingText="Opening…">
      <FileText className="h-4 w-4" aria-hidden="true" /> View slip
    </Button>
  );
};

/** Applicant, terms, repayment and audit-trail view of a loan, shared by the ops modules. */
export const LoanDetails: React.FC<{ loan: Loan; showSlip?: boolean }> = ({ loan, showSlip = true }) => {
  const borrower = borrowerOf(loan);
  const pd = loan.personalDetails;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs text-slate-500">Loan {shortId(loan._id)}</p>
          <p className="text-lg font-semibold text-slate-900">{pd?.fullName ?? borrower?.name ?? 'Applicant'}</p>
          {borrower && <p className="text-sm text-slate-500">{borrower.email}</p>}
        </div>
        <StatusBadge status={loan.status} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section aria-labelledby={`applicant-${loan._id}`}>
          <h3 id={`applicant-${loan._id}`} className="mb-1 text-sm font-semibold text-slate-900">
            Applicant
          </h3>
          <dl className="divide-y divide-slate-100">
            <Row label="PAN">
              <span className="font-mono">{pd?.pan ?? '—'}</span>
            </Row>
            <Row label="Date of birth">{formatCalendarDate(pd?.dob)}</Row>
            <Row label="Monthly salary">{pd ? formatCurrency(pd.monthlySalary) : '—'}</Row>
            <Row label="Employment">{pd ? EMPLOYMENT_LABELS[pd.employmentMode] ?? pd.employmentMode : '—'}</Row>
            {showSlip && (
              <Row label="Salary slip">
                {loan.salarySlip ? (
                  <span className="flex items-center justify-end gap-2">
                    <span className="hidden text-xs font-normal text-slate-500 sm:inline">{formatFileSize(loan.salarySlip.size)}</span>
                    <SalarySlipButton loan={loan} />
                  </span>
                ) : (
                  'Not uploaded'
                )}
              </Row>
            )}
          </dl>
        </section>

        <section aria-labelledby={`terms-${loan._id}`}>
          <h3 id={`terms-${loan._id}`} className="mb-1 text-sm font-semibold text-slate-900">
            Loan terms
          </h3>
          <dl className="divide-y divide-slate-100">
            <Row label="Principal">{formatCurrency(loan.amount)}</Row>
            <Row label="Tenure">{loan.tenureDays} days</Row>
            <Row label="Interest rate">{loan.interestRate}% p.a. (simple)</Row>
            <Row label="Interest">{formatCurrency(loan.simpleInterest)}</Row>
            <Row label="Total repayment">{formatCurrency(loan.totalRepayment)}</Row>
            {loan.totalPaid > 0 && <Row label="Paid so far">{formatCurrency(loan.totalPaid)}</Row>}
            {['DISBURSED', 'CLOSED'].includes(loan.status) && <Row label="Outstanding">{formatCurrency(loan.outstandingBalance)}</Row>}
          </dl>
        </section>
      </div>

      {loan.rejectionReason && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
          <span className="font-semibold">Rejection reason:</span> {loan.rejectionReason}
        </div>
      )}

      {loan.statusHistory && loan.statusHistory.length > 0 && (
        <section aria-labelledby={`history-${loan._id}`}>
          <h3 id={`history-${loan._id}`} className="mb-3 text-sm font-semibold text-slate-900">
            Audit trail
          </h3>
          <ol className="relative space-y-4 border-l border-slate-200 pl-5">
            {loan.statusHistory.map((entry, i) => (
              <li key={`${entry.status}-${i}`} className="relative">
                <span className="absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full bg-brand-500 ring-4 ring-white" aria-hidden="true" />
                <p className="text-sm font-medium text-slate-900">
                  {STATUS_META[entry.status]?.label ?? entry.status}
                  {actorName(entry.by) && <span className="font-normal text-slate-500"> by {actorName(entry.by)}</span>}
                </p>
                <p className="text-xs text-slate-500">{formatDateTime(entry.at)}</p>
                {entry.note && <p className="mt-1 text-sm text-slate-600">{entry.note}</p>}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
};
