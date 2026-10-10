'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Slider } from '../../../../components/ui/Slider';
import { LoanSummaryPanel } from '../../../../components/borrower/LoanSummaryPanel';
import { Button } from '../../../../components/ui/Button';
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import { Alert } from '../../../../components/ui/Alert';
import { Skeleton } from '../../../../components/ui/Skeleton';
import { useDraft } from '../../../../hooks/useDraft';
import { calculateLoanDetails } from '../../../../lib/loanCalculator';
import { LOAN_CONFIG } from '../../../../lib/loanConfig';
import { formatCurrency, formatRupees } from '../../../../lib/format';
import { api, getApiError } from '../../../../lib/api';
import { ApiResponse, Loan } from '../../../../types';

export default function LoanConfigStepPage() {
  const router = useRouter();
  const { data, error, ready } = useDraft('loan-config');
  const [amount, setAmount] = useState(100000);
  const [tenureDays, setTenureDays] = useState(180);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<Loan | null>(null);

  const preview = calculateLoanDetails(amount, tenureDays);

  const submit = async () => {
    if (!data?.draftLoan) return;
    setSubmitError(null);
    try {
      // Only the chosen terms are sent; interest and totals are computed by the server.
      const res = await api.post<ApiResponse<Loan>>(`/borrower/loans/${data.draftLoan._id}/apply`, { amount, tenureDays });
      setSubmitted(res.data.data!);
    } catch (err) {
      setSubmitError(getApiError(err, 'Could not submit your application').message);
    } finally {
      setConfirmOpen(false);
    }
  };

  if (submitted) {
    return (
      <div className="mx-auto max-w-md space-y-5 py-6 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" aria-hidden="true" />
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Application submitted</h2>
          <p className="mt-2 text-sm text-slate-600">
            You applied for <strong>{formatCurrency(submitted.amount)}</strong> over {submitted.tenureDays} days. Total repayment:{' '}
            <strong>{formatCurrency(submitted.totalRepayment)}</strong>. Our sanction team will review it shortly.
          </p>
        </div>
        <Link href="/my-loans">
          <Button>Track my application</Button>
        </Link>
      </div>
    );
  }

  if (error) return <Alert tone="danger">{error}</Alert>;
  if (!ready) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Choose your loan</h2>
        <p className="text-sm text-slate-500">Fixed {LOAN_CONFIG.INTEREST_RATE_PER_ANNUM}% p.a. simple interest. No processing fees.</p>
      </div>

      {submitError && <Alert tone="danger">{submitError}</Alert>}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-8 rounded-xl border border-slate-200 p-5 lg:col-span-3">
          <Slider
            label="Loan amount"
            value={amount}
            min={LOAN_CONFIG.MIN_AMOUNT}
            max={LOAN_CONFIG.MAX_AMOUNT}
            step={LOAN_CONFIG.AMOUNT_STEP}
            onChange={setAmount}
            format={formatRupees}
            unitLabel="₹"
          />
          <Slider
            label="Tenure"
            value={tenureDays}
            min={LOAN_CONFIG.MIN_TENURE_DAYS}
            max={LOAN_CONFIG.MAX_TENURE_DAYS}
            step={LOAN_CONFIG.TENURE_STEP}
            onChange={setTenureDays}
            format={(d) => `${d} days`}
            unitLabel="days"
          />
        </div>
        <div className="lg:col-span-2">
          <LoanSummaryPanel details={preview} />
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-5 sm:flex-row sm:justify-between">
        <Button variant="outline" onClick={() => router.push('/apply/salary-slip')}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
        </Button>
        <Button onClick={() => setConfirmOpen(true)}>Apply for {formatRupees(amount)}</Button>
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Submit your application?"
        confirmLabel="Submit application"
        onConfirm={submit}
        onClose={() => setConfirmOpen(false)}
      >
        <p className="mb-3">You can&apos;t change these terms after submitting.</p>
        <dl className="space-y-1.5 rounded-lg bg-slate-50 p-3">
          <div className="flex justify-between">
            <dt>Loan amount</dt>
            <dd className="font-medium text-slate-900">{formatCurrency(preview.amount)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Tenure</dt>
            <dd className="font-medium text-slate-900">{preview.tenureDays} days</dd>
          </div>
          <div className="flex justify-between">
            <dt>Interest ({preview.interestRate}% p.a.)</dt>
            <dd className="font-medium text-slate-900">{formatCurrency(preview.simpleInterest)}</dd>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-1.5">
            <dt className="font-medium text-slate-900">Total repayment</dt>
            <dd className="font-semibold text-slate-900">{formatCurrency(preview.totalRepayment)}</dd>
          </div>
        </dl>
      </ConfirmDialog>
    </div>
  );
}
