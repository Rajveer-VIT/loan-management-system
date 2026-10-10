import { z } from 'zod';
import { objectIdString } from '../../utils/validation.js';

export const rejectLoanSchema = z.object({
  params: z.object({ id: objectIdString }),
  body: z.object({
    rejectionReason: z
      .string({ required_error: 'Rejection reason is required' })
      .trim()
      .min(10, 'Rejection reason must be at least 10 characters long')
      .max(500, 'Rejection reason must be at most 500 characters'),
  }),
});

export type RejectLoanInput = z.infer<typeof rejectLoanSchema>['body'];
