'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { SalarySlipUploader } from '../../../../components/borrower/SalarySlipUploader';
import { Button } from '../../../../components/ui/Button';
import { Alert } from '../../../../components/ui/Alert';
import { Skeleton } from '../../../../components/ui/Skeleton';
import { useDraft } from '../../../../hooks/useDraft';

export default function SalarySlipStepPage() {
  const router = useRouter();
  const { data, error, ready, reload } = useDraft('salary-slip');

  if (error) return <Alert tone="danger">{error}</Alert>;
  if (!ready || !data?.draftLoan) return <Skeleton className="h-48 w-full" />;

  const loan = data.draftLoan;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Salary slip</h2>
        <p className="text-sm text-slate-500">Upload your most recent salary slip so our team can verify your income.</p>
      </div>

      <SalarySlipUploader
        loanId={loan._id}
        existingSlip={loan.salarySlip}
        onUploaded={() => {
          toast.success('Salary slip uploaded');
          reload();
          router.push('/apply/loan-config');
        }}
      />

      <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-5 sm:flex-row sm:justify-between">
        <Button variant="outline" onClick={() => router.push('/apply/personal-details')}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
        </Button>
        {loan.salarySlip && (
          <Button onClick={() => router.push('/apply/loan-config')}>
            Continue <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </div>
    </div>
  );
}
