import { z } from 'zod';

export const recordPaymentSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Loan ID is required'),
  }),
  body: z.object({
    utrNumber: z.string().trim().min(3, 'UTR number is required'),
    amount: z.number().positive('Payment amount must be greater than 0'),
    paymentDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid payment date'),
  }),
});

export const loanIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Loan ID is required'),
  }),
});

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>['body'];
