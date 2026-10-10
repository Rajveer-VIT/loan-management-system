export const LOAN_CONFIG = {
  INTEREST_RATE_PER_ANNUM: 12, // 12% p.a., simple interest
  MIN_AMOUNT: 50000,
  MAX_AMOUNT: 500000,
  MIN_TENURE_DAYS: 30,
  MAX_TENURE_DAYS: 365,
  BRE: {
    MIN_AGE: 23,
    MAX_AGE: 50,
    MIN_SALARY: 25000,
    // 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F). Input is trimmed and upper-cased first.
    PAN_REGEX: /^[A-Z]{5}[0-9]{4}[A-Z]$/,
  },
} as const;

/**
 * Calendar-date decisions (age on "today", "payment date not in the future",
 * "payment not before disbursal day") are made in this zone, so results don't depend
 * on the server's local time zone.
 */
export const BUSINESS_TIME_ZONE = 'Asia/Kolkata';

export enum EMPLOYMENT_MODE {
  SALARIED = 'SALARIED',
  SELF_EMPLOYED = 'SELF_EMPLOYED',
  UNEMPLOYED = 'UNEMPLOYED',
}
