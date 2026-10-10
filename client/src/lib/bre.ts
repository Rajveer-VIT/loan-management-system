import { EMPLOYMENT_MODE } from '../types';
import { LOAN_CONFIG } from './loanConfig';
import { businessToday } from './dates';

/**
 * Client mirror of server/src/services/bre.service.ts, for instant feedback only.
 * The server re-runs every rule and is the sole authority: this check can be bypassed,
 * the server's cannot.
 */
export interface BRERequest {
  pan: string;
  dob: string; // YYYY-MM-DD
  monthlySalary: number;
  employmentMode: EMPLOYMENT_MODE | string;
}

export interface BRERuleFailure {
  rule: string;
  field?: keyof BRERequest;
  message: string;
}

export interface BREResult {
  eligible: boolean;
  failures: BRERuleFailure[];
}

function parseIsoDate(value: string): [number, number, number] | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [y, m, d] = match.slice(1).map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d));
  const valid = probe.getUTCFullYear() === y && probe.getUTCMonth() === m - 1 && probe.getUTCDate() === d;
  return valid ? [y, m, d] : null;
}

/** Completed years on today's business-zone date; -1 if invalid or in the future. */
export function calculateAge(dob: string, today: string = businessToday()): number {
  const birth = parseIsoDate(dob);
  const now = parseIsoDate(today);
  if (!birth || !now) return -1;
  const [by, bm, bd] = birth;
  const [ty, tm, td] = now;
  if (by > ty || (by === ty && (bm > tm || (bm === tm && bd > td)))) return -1;
  let age = ty - by;
  if (tm < bm || (tm === bm && td < bd)) age--;
  return age;
}

export function evaluateBREClient(data: BRERequest, today: string = businessToday()): BREResult {
  const { MIN_AGE, MAX_AGE, MIN_SALARY, PAN_REGEX } = LOAN_CONFIG.BRE;
  const failures: BRERuleFailure[] = [];

  const age = calculateAge(data.dob, today);
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

  if (!PAN_REGEX.test((data.pan ?? '').trim().toUpperCase())) {
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
