'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SalarySlipUploader } from '../../../../components/borrower/SalarySlipUploader';
import { Button } from '../../../../components/ui/Button';
import { api } from '../../../../lib/api';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { Loan, SalarySlip } from '../../../../types';

export default function SalarySlipStepPage() {
  const router = useRouter();
  const [loanId, setLoanId] = useState<string | null>(null);
  const [existingSlip, setExistingSlip] = useState<SalarySlip | undefined>(undefined);
  const [hasSlipUploaded, setHasSlipUploaded] = useState(false);

  useEffect(() => {
    api.get('/borrower/loans/draft').then((res) => {
      if (res.data.success && res.data.data.draftLoan) {
        const draft = res.data.data.draftLoan;
        setLoanId(draft._id);
        if (draft.salarySlip && draft.salarySlip.storedName) {
          setExistingSlip(draft.salarySlip);
          setHasSlipUploaded(true);
        }
      } else {
        toast.error('Please complete personal details first');
        router.push('/apply/personal-details');
      }
    }).catch(() => {
      router.push('/apply/personal-details');
    });
  }, [router]);

  const handleUploadSuccess = (updatedLoan: Loan) => {
    setExistingSlip(updatedLoan.salarySlip);
    setHasSlipUploaded(true);
    router.push('/apply/loan-config');
  };

  if (!loanId) {
    return <div className="p-8 text-center text-sm text-gray-500">Loading loan context...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-100 pb-4">
        <h2 className="text-lg font-bold text-gray-900">Step 2: Upload Salary Slip</h2>
        <p className="text-xs text-gray-500">
          Upload your latest salary slip (PDF or high-resolution image) for income verification.
        </p>
      </div>

      <SalarySlipUploader loanId={loanId} existingSlip={existingSlip} onSuccess={handleUploadSuccess} />

      <div className="flex justify-between items-center pt-4 border-t border-gray-100">
        <Button variant="outline" onClick={() => router.push('/apply/personal-details')}>
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
        </Button>
        {hasSlipUploaded && (
          <Button variant="primary" onClick={() => router.push('/apply/loan-config')}>
            Continue to Loan Setup
          </Button>
        )}
      </div>
    </div>
  );
}
