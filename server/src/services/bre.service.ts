import { LOAN_CONFIG, EMPLOYMENT_MODE } from '../constants/loanConfig.js';
import { businessDateOf, compareCalendarDates, completedYears, parseCalendarDate } from '../utils/dates.js';

export interface BRERequest {
  pan: string;
  dob: string | Date;
  monthlySalary: number;
  employmentMode: string;
}

export type BRERule = 'INVALID_DOB' | 'AGE_RESTRICTION' | 'MIN_SALARY_THRESHOLD' | 'INVALID_PAN_FORMAT' | 'DISALLOWED_EMPLOYMENT';

export interface BRERuleFailure {
  rule: BRERule;
  field: keyof BRERequest;
  message: string;
}

export interface BREResult {
  eligible: boolean;
  failures: BRERuleFailure[];
}

/**
 * Age in completed years on `referenceDate`'s business-zone calendar day,
 * or -1 if the date of birth is invalid or in the future.
 */
export function calculateAge(dob: string | Date, referenceDate: Date = new Date()): number {
  const birth = parseCalendarDate(dob);
  if (!birth) return -1;
  const today = businessDateOf(referenceDate);
  if (compareCalendarDates(birth, today) > 0) return -1;
  return completedYears(birth, today);
}

export function normalizePan(pan: string): string {
  return pan.trim().toUpperCase();
}

/**
 * Business Rule Engine. Evaluates every rule (not just the first failure) so the
 * applicant sees all reasons at once. This server function is authoritative; the
 * client mirror in `client/src/lib/bre.ts` is only for instant feedback.
 */
export function evaluateBRE(data: BRERequest, referenceDate: Date = new Date()): BREResult {
  const { MIN_AGE, MAX_AGE, MIN_SALARY, PAN_REGEX } = LOAN_CONFIG.BRE;
  const failures: BRERuleFailure[] = [];

  const age = calculateAge(data.dob, referenceDate);
  if (age === -1) {
    failures.push({ rule: 'INVALID_DOB', field: 'dob', message: 'Date of birth is invalid or in the future.' });
  } else if (age < MIN_AGE || age > MAX_AGE) {
    failures.push({
      rule: 'AGE_RESTRICTION',
      field: 'dob',
      message: `Applicant age must be between ${MIN_AGE} and ${MAX_AGE} years (current age: ${age}).`,
    });
  }

  if (!Number.isFinite(data.monthlySalary) || data.monthlySalary < MIN_SALARY) {
    failures.push({
      rule: 'MIN_SALARY_THRESHOLD',
      field: 'monthlySalary',
      message: `Monthly salary must be at least ₹${MIN_SALARY.toLocaleString('en-IN')}.`,
    });
  }

  if (!PAN_REGEX.test(normalizePan(data.pan ?? ''))) {
    failures.push({
      rule: 'INVALID_PAN_FORMAT',
      field: 'pan',
      message: 'PAN must be 10 characters: 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F).',
    });
  }

  if (data.employmentMode === EMPLOYMENT_MODE.UNEMPLOYED) {
    failures.push({
      rule: 'DISALLOWED_EMPLOYMENT',
      field: 'employmentMode',
      message: 'Unemployed applicants are not eligible for a loan.',
    });
  }

  return { eligible: failures.length === 0, failures };
}
