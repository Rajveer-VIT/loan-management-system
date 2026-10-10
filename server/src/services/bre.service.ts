import { LOAN_CONFIG, EMPLOYMENT_MODE } from '../constants/loanConfig.js';

export interface BRERequest {
  fullName: string;
  pan: string;
  dob: string | Date;
  monthlySalary: number;
  employmentMode: EMPLOYMENT_MODE | string;
}

export interface BRERuleFailure {
  rule: string;
  message: string;
}

export interface BREResult {
  eligible: boolean;
  failures: BRERuleFailure[];
}

/**
 * Calculates exact age in years from date of birth relative to present or given target date.
 */
export function calculateAge(dob: string | Date, referenceDate: Date = new Date()): number {
  const birthDate = new Date(dob);
  if (isNaN(birthDate.getTime())) {
    return -1;
  }
  let age = referenceDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = referenceDate.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

/**
 * Business Rule Engine (BRE) pure evaluation function.
 * Evaluates all rules and returns eligible boolean along with all failing reasons.
 */
export function evaluateBRE(data: BRERequest, referenceDate: Date = new Date()): BREResult {
  const failures: BRERuleFailure[] = [];

  // Rule 1: Age boundary
  const age = calculateAge(data.dob, referenceDate);
  if (age === -1) {
    failures.push({
      rule: 'INVALID_DOB',
      message: 'Date of birth is invalid',
    });
  } else if (age < LOAN_CONFIG.BRE.MIN_AGE || age > LOAN_CONFIG.BRE.MAX_AGE) {
    failures.push({
      rule: 'AGE_RESTRICTION',
      message: `Applicant age must be between ${LOAN_CONFIG.BRE.MIN_AGE} and ${LOAN_CONFIG.BRE.MAX_AGE} years (Current age: ${age}).`,
    });
  }

  // Rule 2: Minimum salary
  if (data.monthlySalary < LOAN_CONFIG.BRE.MIN_SALARY) {
    failures.push({
      rule: 'MIN_SALARY_THRESHOLD',
      message: `Monthly salary must be at least ₹${LOAN_CONFIG.BRE.MIN_SALARY.toLocaleString('en-IN')}.`,
    });
  }

  // Rule 3: PAN format validation
  const normalizedPAN = data.pan ? data.pan.trim().toUpperCase() : '';
  if (!LOAN_CONFIG.BRE.PAN_REGEX.test(normalizedPAN)) {
    failures.push({
      rule: 'INVALID_PAN_FORMAT',
      message: 'PAN must be a valid 10-character code matching format ABCDE1234F.',
    });
  }

  // Rule 4: Employment mode
  if (
    data.employmentMode === EMPLOYMENT_MODE.UNEMPLOYED ||
    (LOAN_CONFIG.BRE.DISALLOWED_EMPLOYMENT as readonly string[]).includes(data.employmentMode)
  ) {
    failures.push({
      rule: 'DISALLOWED_EMPLOYMENT',
      message: 'Unemployed applicants are not eligible for a loan.',
    });
  }

  return {
    eligible: failures.length === 0,
    failures,
  };
}
