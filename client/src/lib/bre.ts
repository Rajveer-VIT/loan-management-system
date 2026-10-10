import { EMPLOYMENT_MODE } from '../types';

export interface BRERequest {
  fullName: string;
  pan: string;
  dob: string;
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

export function calculateAge(dobStr: string): number {
  const birthDate = new Date(dobStr);
  if (isNaN(birthDate.getTime())) return -1;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export function evaluateBREClient(data: BRERequest): BREResult {
  const failures: BRERuleFailure[] = [];

  const age = calculateAge(data.dob);
  if (age === -1) {
    failures.push({ rule: 'INVALID_DOB', message: 'Date of birth is invalid' });
  } else if (age < 23 || age > 50) {
    failures.push({
      rule: 'AGE_RESTRICTION',
      message: `Applicant age must be between 23 and 50 years (Current age: ${age}).`,
    });
  }

  if (data.monthlySalary < 25000) {
    failures.push({
      rule: 'MIN_SALARY_THRESHOLD',
      message: 'Monthly salary must be at least ₹25,000.',
    });
  }

  const normalizedPAN = data.pan ? data.pan.trim().toUpperCase() : '';
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
  if (!panRegex.test(normalizedPAN)) {
    failures.push({
      rule: 'INVALID_PAN_FORMAT',
      message: 'PAN must be a valid 10-character code matching format ABCDE1234F.',
    });
  }

  if (data.employmentMode === EMPLOYMENT_MODE.UNEMPLOYED) {
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
