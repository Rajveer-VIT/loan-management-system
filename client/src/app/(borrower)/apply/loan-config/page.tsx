'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Slider } from '../../../../components/ui/Slider';
import { LoanSummaryPanel } from '../../../../components/borrower/LoanSummaryPanel';
import { Button } from '../../../../components/ui/Button';
import { Modal } from '../../../../components/ui/Modal';
import { calculateLoanDetails } from '../../../../lib/loanCalculator';
import { formatCurrency } from '../../../../lib/format';
import { api } from '../../../../lib/api';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react';
import { AxiosError } from 'axios';
import { ApiResponse } from '../../../../types';

export default function LoanConfigStepPage() {
  const router = useRouter();
  const [loanId, setLoanId] = useState<string | null>(null);
  const [amount, setAmount] = useState<number>(100000);
  const [tenureDays, setTenureDays] = useState<number>(180);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  useEffect(() => {
    api.get('/borrower/loans/draft').then((res) => {
      if (res.data.success && res.data.data.draftLoan) {
        const draft = res.data.data.draftLoan;
        setLoanId(draft._id);
        if (draft.amount) setAmount(draft.amount);
        if (draft.tenureDays) setTenureDays(draft.tenureDays);
      } else {
        router.push('/apply/personal-details');
      }
    }).catch(() => {
      router.push('/apply/personal-details');
    });
  }, [router]);

  const calcDetails = calculateLoanDetails(amount, tenureDays);

  const handleConfirmSubmit = async () => {
    if (!loanId) return;
    setIsSubmitting(true);

    try {
      const res = await api.post(`/borrower/loans/${loanId}/apply`, {
        amount,
        tenureDays,
      });

      if (res.data.success) {
        setIsConfirmModalOpen(false);
        setIsSuccess(true);
        toast.success('Loan application submitted successfully!');
      }
    } catch (error: unknown) {
      const axiosErr = error as AxiosError<ApiResponse>;
      toast.error(axiosErr.response?.data?.message || 'Failed to submit loan application');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center py-12 space-y-6 animate-fade-in">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-100">
          <CheckCircle2 className="w-12 h-12 stroke-[2.5]" />
        </div>
        <div className="space-y-2 max-w-md mx-auto">
          <h2 className="text-2xl font-black text-gray-900">Application Submitted!</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Your application for <strong>{formatCurrency(amount)}</strong> for {tenureDays} days is now in the <strong>APPLIED</strong> queue for Underwriting review.
          </p>
        </div>
        <div className="pt-4">
          <Button variant="primary" onClick={() => router.push('/my-loans')}>
            Go to My Loans Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="border-b border-gray-100 pb-4">
        <h2 className="text-lg font-bold text-gray-900">Step 3: Configure Loan Terms</h2>
        <p className="text-xs text-gray-500">
          Select your required principal amount and tenure duration. Interest is fixed at 12% p.a.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-8 bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
          <Slider
            label="Required Loan Amount"
            prefix="₹"
            value={amount}
            min={50000}
            max={500000}
            step={5000}
            onChange={setAmount}
          />

          <Slider
            label="Tenure Duration"
            unit=" Days"
            value={tenureDays}
            min={30}
            max={365}
            step={5}
            onChange={setTenureDays}
          />

          <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs text-indigo-900 flex items-start space-x-3">
            <ShieldCheck className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
            <p>
              Your simple interest and total repayment are computed deterministically on our server. No extra processing fees or early repayment penalties apply.
            </p>
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <LoanSummaryPanel details={calcDetails} />

          <Button
            variant="primary"
            size="lg"
            onClick={() => setIsConfirmModalOpen(true)}
            className="w-full shadow-indigo-200"
          >
            Apply for Loan ({formatCurrency(amount)})
          </Button>

          <Button
            variant="ghost"
            onClick={() => router.push('/apply/salary-slip')}
            className="w-full text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Salary Slip
          </Button>
        </div>
      </div>

      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title="Confirm Loan Application Submission"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 leading-relaxed">
            Are you sure you want to submit your loan application with the following finalized terms?
          </p>
          <div className="bg-gray-50 p-4 rounded-xl space-y-2 text-xs text-gray-700">
            <div className="flex justify-between">
              <span>Principal Amount:</span>
              <strong className="text-gray-900">{formatCurrency(calcDetails.amount)}</strong>
            </div>
            <div className="flex justify-between">
              <span>Tenure Duration:</span>
              <strong className="text-gray-900">{calcDetails.tenureDays} Days</strong>
            </div>
            <div className="flex justify-between">
              <span>Interest Rate:</span>
              <strong className="text-gray-900">12.00% p.a.</strong>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-2 text-sm font-bold text-indigo-900">
              <span>Total Repayment:</span>
              <span>{formatCurrency(calcDetails.totalRepayment)}</span>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-3">
            <Button variant="outline" onClick={() => setIsConfirmModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleConfirmSubmit} isLoading={isSubmitting}>
              Yes, Submit Application
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
