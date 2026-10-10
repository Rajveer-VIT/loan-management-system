'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ShieldAlert } from 'lucide-react';
import { personalDetailsFormSchema, PersonalDetailsFormValues } from '../../lib/validators';
import { evaluateBREClient, BRERuleFailure } from '../../lib/bre';
import { api, getApiError } from '../../lib/api';
import { businessToday, toDateInputValue } from '../../lib/dates';
import { LOAN_CONFIG } from '../../lib/loanConfig';
import { ApiResponse, EMPLOYMENT_MODE, Loan, PersonalDetails } from '../../types';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';

interface PersonalDetailsFormProps {
  initialData?: PersonalDetails;
  onSuccess: (loan: Loan) => void;
}

const BRE_FIELDS = ['pan', 'dob', 'monthlySalary', 'employmentMode'] as const;
type BreField = (typeof BRE_FIELDS)[number];

function isBreField(field: string | undefined): field is BreField {
  return !!field && (BRE_FIELDS as readonly string[]).includes(field);
}

export const PersonalDetailsForm: React.FC<PersonalDetailsFormProps> = ({ initialData, onSuccess }) => {
  const [breFailures, setBreFailures] = useState<BRERuleFailure[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PersonalDetailsFormValues>({
    resolver: zodResolver(personalDetailsFormSchema),
    defaultValues: {
      fullName: initialData?.fullName ?? '',
      pan: initialData?.pan ?? '',
      dob: toDateInputValue(initialData?.dob),
      monthlySalary: initialData?.monthlySalary,
      employmentMode: initialData?.employmentMode ?? EMPLOYMENT_MODE.SALARIED,
    },
  });

  /** Shows BRE failures both inline on their fields and in one summary panel. */
  const showFailures = (failures: BRERuleFailure[]) => {
    setBreFailures(failures);
    failures.forEach((f) => {
      if (isBreField(f.field)) setError(f.field, { type: 'bre', message: f.message });
    });
  };

  const onSubmit = async (values: PersonalDetailsFormValues) => {
    setFormError(null);
    const payload = { ...values, pan: values.pan.trim().toUpperCase() };

    // Instant feedback only. The server runs the same rules and is authoritative.
    const preview = evaluateBREClient(payload);
    if (!preview.eligible) {
      showFailures(preview.failures);
      return;
    }
    setBreFailures([]);

    try {
      const res = await api.post<ApiResponse<Loan>>('/borrower/profile', payload);
      onSuccess(res.data.data!);
    } catch (err) {
      const info = getApiError(err, 'Could not save your details');
      if (info.code === 'BRE_VALIDATION_FAILED') {
        showFailures(info.errors as BRERuleFailure[]);
      } else if (info.errors.length > 0 && info.code === 'VALIDATION_ERROR') {
        info.errors.forEach((e) => {
          if (e.field && e.field in values) setError(e.field as keyof PersonalDetailsFormValues, { message: e.message });
        });
      } else {
        setFormError(info.message);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {formError && <Alert tone="danger">{formError}</Alert>}

      <Input label="Full name (as on PAN)" required autoComplete="name" {...register('fullName')} error={errors.fullName?.message} />

      <div className="grid gap-5 md:grid-cols-2">
        <Input
          label="PAN"
          required
          maxLength={10}
          autoComplete="off"
          placeholder="ABCDE1234F"
          className="font-mono uppercase"
          {...register('pan')}
          error={errors.pan?.message}
          helperText="5 letters, 4 digits, 1 letter"
        />
        <Input
          label="Date of birth"
          required
          type="date"
          max={businessToday()}
          {...register('dob')}
          error={errors.dob?.message}
          helperText={`You must be ${LOAN_CONFIG.BRE.MIN_AGE}–${LOAN_CONFIG.BRE.MAX_AGE} years old`}
        />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Input
          label="Monthly salary (₹)"
          required
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          placeholder="e.g. 45000"
          {...register('monthlySalary')}
          error={errors.monthlySalary?.message}
          helperText={`Minimum ₹${LOAN_CONFIG.BRE.MIN_SALARY.toLocaleString('en-IN')} per month`}
        />
        <Select
          label="Employment mode"
          required
          options={[
            { value: EMPLOYMENT_MODE.SALARIED, label: 'Salaried' },
            { value: EMPLOYMENT_MODE.SELF_EMPLOYED, label: 'Self-employed' },
            { value: EMPLOYMENT_MODE.UNEMPLOYED, label: 'Unemployed' },
          ]}
          {...register('employmentMode')}
          error={errors.employmentMode?.message}
        />
      </div>

      {breFailures.length > 0 && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          <p className="flex items-center gap-2 font-semibold">
            <ShieldAlert className="h-5 w-5 text-rose-600" aria-hidden="true" />
            You are not eligible for a loan right now
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            {breFailures.map((f) => (
              <li key={f.rule}>{f.message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex justify-end border-t border-slate-200 pt-5">
        <Button type="submit" isLoading={isSubmitting} loadingText="Checking eligibility…" className="w-full sm:w-auto">
          Check eligibility & continue
        </Button>
      </div>
    </form>
  );
};
