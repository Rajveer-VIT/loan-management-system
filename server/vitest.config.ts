import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
    // Integration suites share one test database, so run files one at a time.
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
    env: {
      NODE_ENV: 'test',
      // Test-only values; real values come from .env, which these override only under vitest.
      JWT_SECRET: 'test-only-jwt-secret-not-for-production-use',
      MONGODB_URI: process.env.MONGODB_TEST_URI ?? 'mongodb://127.0.0.1:27017/lms_test',
      UPLOAD_DIR: 'uploads-test',
      CLIENT_URL: 'http://localhost:3000',
    },
  },
});
