'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { personalDetailsFormSchema } from '../../lib/validators';
import { EMPLOYMENT_MODE, Loan, ApiResponse } from '../../types';
import { evaluateBREClient, BRERuleFailure } from '../../lib/bre';
import { api } from '../../lib/api';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { AxiosError } from 'axios';

interface FormData {
  fullName: string;
  pan: string;
  dob: string;
  monthlySalary: number;
  employmentMode: EMPLOYMENT_MODE;
}

interface PersonalDetailsFormProps {
  initialData?: Partial<FormData>;
  onSuccess: (loanData: Loan) => void;
}

export const PersonalDetailsForm: React.FC<PersonalDetailsFormProps> = ({
  initialData,
  onSuccess,
}) => {
  const [breFailures, setBreFailures] = useState<BRERuleFailure[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(personalDetailsFormSchema),
    defaultValues: {
      fullName: initialData?.fullName || '',
      pan: initialData?.pan || '',
      dob: initialData?.dob ? new Date(initialData.dob).toISOString().split('T')[0] : '',
      monthlySalary: initialData?.monthlySalary || 35000,
      employmentMode: initialData?.employmentMode || EMPLOYMENT_MODE.SALARIED,
    },
  });

  const onSubmit = async (data: FormData) => {
    const clientBre = evaluateBREClient({
      fullName: data.fullName,
      pan: data.pan,
      dob: data.dob,
      monthlySalary: data.monthlySalary,
      employmentMode: data.employmentMode,
    });

    if (!clientBre.eligible) {
      setBreFailures(clientBre.failures);
      toast.error('Application does not meet eligibility requirements');
      return;
    }

    setBreFailures([]);
    setIsLoading(true);

    try {
      const res = await api.post('/borrower/profile', {
        fullName: data.fullName,
        pan: data.pan.toUpperCase(),
        dob: data.dob,
        monthlySalary: Number(data.monthlySalary),
        employmentMode: data.employmentMode,
      });

      if (res.data.success) {
        toast.success('Eligibility verified successfully!');
        onSuccess(res.data.data);
      }
    } catch (error: unknown) {
      const axiosErr = error as AxiosError<ApiResponse>;
      if (axiosErr.response?.status === 422 && axiosErr.response?.data?.errors) {
        setBreFailures(axiosErr.response.data.errors as BRERuleFailure[]);
        toast.error(axiosErr.response.data.message || 'BRE evaluation failed');
      } else {
        toast.error(axiosErr.response?.data?.message || 'Failed to submit profile');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input
          label="Full Name (as per PAN)"
          placeholder="e.g. Rahul Sharma"
          {...register('fullName')}
          error={errors.fullName?.message}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="PAN Number"
            placeholder="ABCDE1234F"
            maxLength={10}
            {...register('pan')}
            onChange={(e) => {
              setValue('pan', e.target.value.toUpperCase());
            }}
            error={errors.pan?.message}
            helperText="10-digit uppercase alphanumeric PAN code"
          />

          <Input
            label="Date of Birth"
            type="date"
            {...register('dob')}
            error={errors.dob?.message}
            helperText="Must be between 23 and 50 years old"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Monthly Net Salary (₹)"
            type="number"
            placeholder="35000"
            {...register('monthlySalary')}
            error={errors.monthlySalary?.message}
            helperText="Minimum ₹25,000 per month"
          />

          <Select
            label="Employment Status"
            options={[
              { value: EMPLOYMENT_MODE.SALARIED, label: 'Salaried Employee' },
              { value: EMPLOYMENT_MODE.SELF_EMPLOYED, label: 'Self Employed' },
              { value: EMPLOYMENT_MODE.UNEMPLOYED, label: 'Unemployed' },
            ]}
            {...register('employmentMode')}
            error={errors.employmentMode?.message}
          />
        </div>

        {breFailures.length > 0 && (
          <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-5 space-y-3 animate-shake">
            <div className="flex items-center space-x-2 text-rose-800 font-bold">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              <span>Not Eligible for Loan Application</span>
            </div>
            <p className="text-xs text-rose-700">
              Your profile does not satisfy our instant Business Rule Engine (BRE) eligibility criteria:
            </p>
            <ul className="space-y-1.5 list-disc list-inside text-xs font-semibold text-rose-800">
              {breFailures.map((failure, idx) => (
                <li key={idx}>{failure.message}</li>
              ))}
            </ul>
          </div>
        )}

        <Button type="submit" isLoading={isLoading} className="w-full">
          Save & Verify Eligibility
        </Button>
      </form>
    </div>
  );
};
