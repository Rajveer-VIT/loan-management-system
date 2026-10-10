'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { recordPaymentFormSchema } from '../../lib/validators';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../lib/format';
import { api } from '../../lib/api';
import { toast } from 'sonner';
import { Receipt, Zap } from 'lucide-react';
import { AxiosError } from 'axios';
import { ApiResponse, Loan, Payment } from '../../types';

interface PaymentResult {
  payment: Payment;
  loan: Loan;
  isClosed: boolean;
}

interface PaymentFormProps {
  loanId: string;
  outstandingBalance: number;
  onSuccess: (result: PaymentResult) => void;
}

interface FormData {
  utrNumber: string;
  amount: number;
  paymentDate: string;
}

export const PaymentForm: React.FC<PaymentFormProps> = ({
  loanId,
  outstandingBalance,
  onSuccess,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(recordPaymentFormSchema),
    defaultValues: {
      utrNumber: '',
      amount: outstandingBalance,
      paymentDate: todayStr,
    },
  });

  const handlePayFull = () => {
    setValue('amount', outstandingBalance);
    toast.info(`Amount set to full outstanding: ${formatCurrency(outstandingBalance)}`);
  };

  const onSubmit = async (data: FormData) => {
    if (data.amount > outstandingBalance + 0.01) {
      toast.error(`Overpayment rejected! Max balance is ${formatCurrency(outstandingBalance)}`);
      return;
    }

    setIsLoading(true);

    try {
      const res = await api.post(`/collection/loans/${loanId}/payments`, {
        utrNumber: data.utrNumber.toUpperCase(),
        amount: Number(data.amount),
        paymentDate: data.paymentDate,
      });

      if (res.data.success) {
        toast.success(res.data.message || 'Payment recorded successfully!');
        onSuccess(res.data.data);
      }
    } catch (error: unknown) {
      const axiosErr = error as AxiosError<ApiResponse>;
      toast.error(axiosErr.response?.data?.message || 'Failed to record payment');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 bg-gray-50 border border-gray-200 rounded-2xl p-5">
      <div className="flex items-center justify-between border-b border-gray-200 pb-3">
        <h4 className="text-sm font-bold text-gray-900 flex items-center">
          <Receipt className="w-4 h-4 mr-1.5 text-indigo-600" /> Record New Repayment
        </h4>
        <button
          type="button"
          onClick={handlePayFull}
          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg flex items-center transition-colors"
        >
          <Zap className="w-3.5 h-3.5 mr-1 text-amber-500 fill-amber-500" /> Pay Full Outstanding
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Input
          label="UTR Number"
          placeholder="e.g. UTR987654321"
          {...register('utrNumber')}
          onChange={(e) => setValue('utrNumber', e.target.value.toUpperCase())}
          error={errors.utrNumber?.message}
        />

        <Input
          label="Repayment Amount (₹)"
          type="number"
          step="0.01"
          placeholder="0.00"
          {...register('amount')}
          error={errors.amount?.message}
        />

        <Input
          label="Payment Date"
          type="date"
          max={todayStr}
          {...register('paymentDate')}
          error={errors.paymentDate?.message}
        />
      </div>

      <Button type="submit" isLoading={isLoading} className="w-full">
        Record Payment & Update Loan
      </Button>
    </form>
  );
};
