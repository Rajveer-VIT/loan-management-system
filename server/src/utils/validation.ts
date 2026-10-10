import mongoose from 'mongoose';
import { z } from 'zod';

/** Zod validator for a 24-hex MongoDB ObjectId route parameter. */
export const objectIdString = z
  .string()
  .refine((val) => mongoose.Types.ObjectId.isValid(val) && /^[a-f\d]{24}$/i.test(val), {
    message: 'Invalid ID format',
  });

/** Reusable `{ params: { id } }` schema for routes that take a loan/user ID. */
export const idParamSchema = z.object({
  params: z.object({ id: objectIdString }),
});
