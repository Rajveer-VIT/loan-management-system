import { z } from 'zod';
import { EMPLOYMENT_MODE } from '../types';

export const loginFormSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const signupFormSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72, 'Password must be at most 72 characters'),
});

// Shape checks only; the eligibility rules (age, salary, PAN, employment) are shown
// through the BRE mirror so the borrower sees the same messages the server returns.
export const personalDetailsFormSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required').max(100, 'Full name is too long'),
  pan: z.string().trim().min(1, 'PAN is required'),
  dob: z.string().min(1, 'Date of birth is required'),
  monthlySalary: z.coerce
    .number({ invalid_type_error: 'Enter your monthly salary' })
    .nonnegative('Salary cannot be negative'),
  employmentMode: z.nativeEnum(EMPLOYMENT_MODE),
});

export type PersonalDetailsFormValues = z.infer<typeof personalDetailsFormSchema>;

const hasAtMostTwoDecimals = (n: number) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6;

export function recordPaymentFormSchema(outstandingBalance: number, minDate: string, maxDate: string) {
  return z.object({
    utrNumber: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9]{6,30}$/, 'UTR must be 6–30 letters or digits'),
    amount: z.coerce
      .number({ invalid_type_error: 'Enter an amount' })
      .positive('Amount must be greater than 0')
      .refine(hasAtMostTwoDecimals, 'At most 2 decimal places')
      .refine((n) => n <= outstandingBalance, `Cannot exceed the outstanding ₹${outstandingBalance.toLocaleString('en-IN')}`),
    paymentDate: z
      .string()
      .min(1, 'Payment date is required')
      .refine((d) => d <= maxDate, 'Payment date cannot be in the future')
      .refine((d) => d >= minDate, `Payment date cannot be before the disbursal date (${minDate})`),
  });
}

export type RecordPaymentFormValues = z.infer<ReturnType<typeof recordPaymentFormSchema>>;

export const REJECTION_REASON_MIN = 10;
export const REJECTION_REASON_MAX = 500;
