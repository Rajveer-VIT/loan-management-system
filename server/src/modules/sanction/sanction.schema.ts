import { z } from 'zod';

export const rejectLoanSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Loan ID is required'),
  }),
  body: z.object({
    rejectionReason: z
      .string()
      .trim()
      .min(5, 'Rejection reason must be at least 5 characters long'),
  }),
});

export const loanIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Loan ID is required'),
  }),
});

export type RejectLoanInput = z.infer<typeof rejectLoanSchema>['body'];
