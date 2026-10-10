import { z } from 'zod';
import { EMPLOYMENT_MODE } from '../types';

export const loginFormSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const signupFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const personalDetailsFormSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  pan: z
    .string()
    .regex(/^[A-Za-z]{5}[0-9]{4}[A-Za-z]$/, 'PAN format must be ABCDE1234F'),
  dob: z.string().min(1, 'Date of birth is required'),
  monthlySalary: z.coerce.number().min(1, 'Salary must be greater than 0'),
  employmentMode: z.nativeEnum(EMPLOYMENT_MODE),
});

export const recordPaymentFormSchema = z.object({
  utrNumber: z.string().min(3, 'UTR number is required'),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  paymentDate: z.string().min(1, 'Payment date is required'),
});

export const rejectFormSchema = z.object({
  rejectionReason: z.string().min(5, 'Rejection reason must be at least 5 characters long'),
});
