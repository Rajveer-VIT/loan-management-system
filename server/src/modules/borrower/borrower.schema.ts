import { z } from 'zod';
import { EMPLOYMENT_MODE, LOAN_CONFIG } from '../../constants/loanConfig.js';
import { objectIdString } from '../../utils/validation.js';

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

// Shape checks only. Eligibility rules (age, salary floor, PAN format, employment) are
// decided by the BRE so every rule failure is reported the same way (422 + rule list).
export const saveProfileSchema = z.object({
  body: z.object({
    fullName: z
      .string({ required_error: 'Full name is required' })
      .trim()
      .min(2, 'Full name must be at least 2 characters')
      .max(100, 'Full name must be at most 100 characters'),
    pan: z.string({ required_error: 'PAN is required' }).trim().min(1, 'PAN is required').max(20, 'PAN is too long'),
    dob: z.string({ required_error: 'Date of birth is required' }).trim().min(1, 'Date of birth is required').max(30),
    monthlySalary: z
      .number({ required_error: 'Monthly salary is required', invalid_type_error: 'Monthly salary must be a number' })
      .finite('Monthly salary must be a finite number')
      .nonnegative('Monthly salary cannot be negative')
      .max(100_000_000, 'Monthly salary is unrealistically large'),
    employmentMode: z.nativeEnum(EMPLOYMENT_MODE, {
      errorMap: () => ({ message: 'Employment mode must be SALARIED, SELF_EMPLOYED or UNEMPLOYED' }),
    }),
  }),
});

export const applyLoanSchema = z.object({
  params: z.object({ id: objectIdString }),
  body: z.object({
    amount: z
      .number({ required_error: 'Loan amount is required', invalid_type_error: 'Loan amount must be a number' })
      .int('Loan amount must be a whole number of rupees')
      .min(LOAN_CONFIG.MIN_AMOUNT, `Minimum amount is ${inr(LOAN_CONFIG.MIN_AMOUNT)}`)
      .max(LOAN_CONFIG.MAX_AMOUNT, `Maximum amount is ${inr(LOAN_CONFIG.MAX_AMOUNT)}`),
    tenureDays: z
      .number({ required_error: 'Tenure is required', invalid_type_error: 'Tenure must be a number' })
      .int('Tenure must be a whole number of days')
      .min(LOAN_CONFIG.MIN_TENURE_DAYS, `Minimum tenure is ${LOAN_CONFIG.MIN_TENURE_DAYS} days`)
      .max(LOAN_CONFIG.MAX_TENURE_DAYS, `Maximum tenure is ${LOAN_CONFIG.MAX_TENURE_DAYS} days`),
  }),
});

export type SaveProfileInput = z.infer<typeof saveProfileSchema>['body'];
export type ApplyLoanInput = z.infer<typeof applyLoanSchema>['body'];
