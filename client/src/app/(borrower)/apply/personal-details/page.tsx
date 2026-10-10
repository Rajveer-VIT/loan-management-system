'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PersonalDetailsForm } from '../../../../components/borrower/PersonalDetailsForm';
import { api } from '../../../../lib/api';
import { Loan, PersonalDetails } from '../../../../types';

export default function PersonalDetailsStepPage() {
  const router = useRouter();
  const [initialData, setInitialData] = useState<Partial<PersonalDetails> | undefined>(undefined);

  useEffect(() => {
    api
      .get('/borrower/loans/draft')
      .then((res) => {
        if (res.data.success && res.data.data.draftLoan) {
          const draft = res.data.data.draftLoan;
          if (draft.personalDetails) {
            setInitialData(draft.personalDetails);
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleSuccess = (loanData: Loan) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('lms_active_loan_id', loanData._id);
    }
    router.push('/apply/salary-slip');
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-100 pb-4">
        <h2 className="text-lg font-bold text-gray-900">Step 1: Personal & Financial Eligibility</h2>
        <p className="text-xs text-gray-500">
          Provide accurate details as verified on your PAN card and salary slips.
        </p>
      </div>

      <PersonalDetailsForm initialData={initialData} onSuccess={handleSuccess} />
    </div>
  );
}
