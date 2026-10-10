import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const PLACEHOLDER_SECRET = /change-me|replace-with/i;

const envSchema = z
  .object({
    PORT: z.coerce.number().int().positive().default(5000),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    MONGODB_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/lms'),
    JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters long'),
    JWT_EXPIRES_IN: z.string().default('1d'),
    /** Comma-separated list of allowed browser origins. */
    CLIENT_URL: z.string().default('http://localhost:3000'),
    /** Directory for salary slips, relative to the server working directory. Never served statically. */
    UPLOAD_DIR: z.string().default('uploads'),
  })
  .superRefine((val, ctx) => {
    if (val.NODE_ENV !== 'production') return;
    if (val.JWT_SECRET.length < 32 || PLACEHOLDER_SECRET.test(val.JWT_SECRET)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_SECRET'],
        message: 'In production JWT_SECRET must be a random value of at least 32 characters',
      });
    }
  });

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    // Print only variable names and messages, never values.
    console.error('Invalid environment variables:', result.error.flatten().fieldErrors);
    process.exit(1);
  }
  return {
    ...result.data,
    CLIENT_ORIGINS: result.data.CLIENT_URL.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  };
};

export const env = parseEnv();
