'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PersonalDetailsForm } from '../../../../components/borrower/PersonalDetailsForm';
import { Alert } from '../../../../components/ui/Alert';
import { Button } from '../../../../components/ui/Button';
import { Skeleton } from '../../../../components/ui/Skeleton';
import { useApiData } from '../../../../hooks/useApi';
import { DraftState, Loan, LOAN_STATUS } from '../../../../types';

const OPEN_STATUSES = [LOAN_STATUS.APPLIED, LOAN_STATUS.SANCTIONED, LOAN_STATUS.DISBURSED];

export default function PersonalDetailsStepPage() {
  const router = useRouter();
  const draft = useApiData<DraftState>('/borrower/loans/draft');
  const loans = useApiData<Loan[]>('/borrower/loans');

  if (draft.error || loans.error) return <Alert tone="danger">{draft.error ?? loans.error}</Alert>;
  if (!draft.data || !loans.data) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-2/3" />
      </div>
    );
  }

  const openLoan = loans.data.find((l) => OPEN_STATUSES.includes(l.status));
  if (openLoan) {
    return (
      <Alert
        tone="info"
        title="You already have an active loan"
        action={
          <Link href="/my-loans">
            <Button size="sm">View my loans</Button>
          </Link>
        }
      >
        Only one active loan is allowed at a time. You can apply again once your current loan is closed or rejected.
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Personal details</h2>
        <p className="text-sm text-slate-500">We check your eligibility instantly against our lending criteria.</p>
      </div>
      <PersonalDetailsForm
        initialData={draft.data.draftLoan?.personalDetails}
        onSuccess={() => {
          toast.success('You are eligible. Next, upload your salary slip.');
          router.push('/apply/salary-slip');
        }}
      />
    </div>
  );
}
