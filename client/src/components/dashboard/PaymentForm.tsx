'use client';

import React, { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { recordPaymentFormSchema, RecordPaymentFormValues } from '../../lib/validators';
import { api, getApiError } from '../../lib/api';
import { businessToday } from '../../lib/dates';
import { formatCurrency } from '../../lib/format';
import { ApiResponse, PaymentResult } from '../../types';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';

interface PaymentFormProps {
  loanId: string;
  outstandingBalance: number;
  disbursedAt?: string;
  onRecorded: (result: PaymentResult) => void;
}

export const PaymentForm: React.FC<PaymentFormProps> = ({ loanId, outstandingBalance, disbursedAt, onRecorded }) => {
  const today = businessToday();
  const minDate = disbursedAt ? businessToday(new Date(disbursedAt)) : '2000-01-01';
  const schema = useMemo(() => recordPaymentFormSchema(outstandingBalance, minDate, today), [outstandingBalance, minDate, today]);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RecordPaymentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { utrNumber: '', amount: undefined, paymentDate: today },
  });

  const onSubmit = async (values: RecordPaymentFormValues) => {
    setServerError(null);
    try {
      const res = await api.post<ApiResponse<PaymentResult>>(`/collection/loans/${loanId}/payments`, values);
      const result = res.data.data!;
      toast.success(res.data.message ?? 'Payment recorded');
      reset({ utrNumber: '', amount: undefined, paymentDate: today });
      onRecorded(result);
    } catch (err) {
      const info = getApiError(err, 'Could not record the payment');
      const fieldErrors = info.errors.filter((e) => e.field === 'utrNumber' || e.field === 'amount' || e.field === 'paymentDate');
      fieldErrors.forEach((e) => setError(e.field as keyof RecordPaymentFormValues, { message: e.message }));
      if (fieldErrors.length === 0) setServerError(info.message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">Record a payment</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setValue('amount', outstandingBalance, { shouldValidate: true })}
        >
          Fill full balance ({formatCurrency(outstandingBalance)})
        </Button>
      </div>

      {serverError && <Alert tone="danger">{serverError}</Alert>}

      <div className="grid gap-4 sm:grid-cols-3">
        <Input
          label="UTR number"
          required
          autoComplete="off"
          placeholder="e.g. HDFC0012345678"
          {...register('utrNumber', { setValueAs: (v: string) => v.toUpperCase().trim() })}
          error={errors.utrNumber?.message}
          helperText="Unique bank reference"
          className="font-mono uppercase"
        />
        <Input
          label="Amount (₹)"
          required
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0.01"
          max={outstandingBalance}
          {...register('amount')}
          error={errors.amount?.message}
          helperText={`Max ${formatCurrency(outstandingBalance)}`}
        />
        <Input
          label="Payment date"
          required
          type="date"
          min={minDate}
          max={today}
          {...register('paymentDate')}
          error={errors.paymentDate?.message}
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" isLoading={isSubmitting} loadingText="Recording…">
          Record payment
        </Button>
      </div>
    </form>
  );
};
