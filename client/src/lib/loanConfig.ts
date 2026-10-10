/** Mirrors server/src/constants/loanConfig.ts. The server is authoritative. */
export const LOAN_CONFIG = {
  INTEREST_RATE_PER_ANNUM: 12,
  MIN_AMOUNT: 50000,
  MAX_AMOUNT: 500000,
  AMOUNT_STEP: 5000,
  MIN_TENURE_DAYS: 30,
  MAX_TENURE_DAYS: 365,
  TENURE_STEP: 1,
  BRE: {
    MIN_AGE: 23,
    MAX_AGE: 50,
    MIN_SALARY: 25000,
    PAN_REGEX: /^[A-Z]{5}[0-9]{4}[A-Z]$/,
  },
  MAX_UPLOAD_BYTES: 5 * 1024 * 1024,
} as const;

/** Calendar dates (age today, payment dates) are evaluated in this zone, as on the server. */
export const BUSINESS_TIME_ZONE = 'Asia/Kolkata';
