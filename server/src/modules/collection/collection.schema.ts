import { z } from 'zod';
import { objectIdString } from '../../utils/validation.js';

const hasAtMostTwoDecimals = (n: number) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6;

export const recordPaymentSchema = z.object({
  params: z.object({ id: objectIdString }),
  body: z.object({
    utrNumber: z
      .string({ required_error: 'UTR number is required' })
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9]{6,30}$/, 'UTR number must be 6–30 letters or digits'),
    amount: z
      .number({ required_error: 'Payment amount is required', invalid_type_error: 'Payment amount must be a number' })
      .finite()
      .positive('Payment amount must be greater than 0')
      .refine(hasAtMostTwoDecimals, 'Payment amount can have at most 2 decimal places'),
    paymentDate: z
      .string({ required_error: 'Payment date is required' })
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Payment date must be in YYYY-MM-DD format'),
  }),
});

export const listCollectionSchema = z.object({
  query: z.object({
    status: z.enum(['DISBURSED', 'CLOSED', 'ALL']).optional(),
  }),
});

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>['body'];
