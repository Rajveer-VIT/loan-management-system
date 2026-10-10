import { z } from 'zod';
import { EMPLOYMENT_MODE, LOAN_CONFIG } from '../../constants/loanConfig.js';

export const saveProfileSchema = z.object({
  body: z.object({
    fullName: z.string().min(2, 'Full name is required'),
    pan: z
      .string()
      .regex(/^[A-Za-z]{5}[0-9]{4}[A-Za-z]$/, 'Invalid PAN format. Must be 10 characters (e.g. ABCDE1234F)'),
    dob: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date of birth'),
    monthlySalary: z.number().min(0, 'Salary must be a positive number'),
    employmentMode: z.nativeEnum(EMPLOYMENT_MODE, {
      errorMap: () => ({ message: 'Invalid employment mode' }),
    }),
  }),
});

export const applyLoanSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Loan ID is required'),
  }),
  body: z.object({
    amount: z
      .number()
      .min(LOAN_CONFIG.MIN_AMOUNT, `Minimum amount is ₹${LOAN_CONFIG.MIN_AMOUNT.toLocaleString('en-IN')}`)
      .max(LOAN_CONFIG.MAX_AMOUNT, `Maximum amount is ₹${LOAN_CONFIG.MAX_AMOUNT.toLocaleString('en-IN')}`),
    tenureDays: z
      .number()
      .min(LOAN_CONFIG.MIN_TENURE_DAYS, `Minimum tenure is ${LOAN_CONFIG.MIN_TENURE_DAYS} days`)
      .max(LOAN_CONFIG.MAX_TENURE_DAYS, `Maximum tenure is ${LOAN_CONFIG.MAX_TENURE_DAYS} days`),
  }),
});

export const loanParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Loan ID is required'),
  }),
});

export type SaveProfileInput = z.infer<typeof saveProfileSchema>['body'];
export type ApplyLoanInput = z.infer<typeof applyLoanSchema>['body'];
