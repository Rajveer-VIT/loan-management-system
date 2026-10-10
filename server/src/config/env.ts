import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('5000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/lms'),
  JWT_SECRET: z.string().min(10, 'JWT_SECRET must be at least 10 characters long'),
  JWT_EXPIRES_IN: z.string().default('1d'),
  CLIENT_URL: z.string().default('http://localhost:3000'),
});

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid Environment Variables:', result.error.format());
    process.exit(1);
  }
  return result.data;
};

export const env = parseEnv();
