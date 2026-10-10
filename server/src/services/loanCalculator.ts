import { LOAN_CONFIG } from '../constants/loanConfig.js';

export interface CalculationResult {
  amount: number;
  tenureDays: number;
  interestRate: number;
  simpleInterest: number;
  totalRepayment: number;
}

/** Rounds a rupee amount to 2 decimal places (paise), half away from zero. */
export function roundMoney(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

/**
 * Simple interest per the assignment: SI = (P × R × T) / (365 × 100), T in days.
 *
 * The interest is computed in integer paise: P × 100 × R × T is an exact integer
 * (at most 2.19e11, well inside Number.MAX_SAFE_INTEGER), so the only rounding is
 * the final division to the nearest paisa. That avoids floating-point drift.
 */
export function calculateLoanDetails(amount: number, tenureDays: number): CalculationResult {
  const rate = LOAN_CONFIG.INTEREST_RATE_PER_ANNUM;
  const principalPaise = Math.round(amount * 100);
  const interestPaise = Math.round((principalPaise * rate * tenureDays) / (365 * 100));

  return {
    amount: principalPaise / 100,
    tenureDays,
    interestRate: rate,
    simpleInterest: interestPaise / 100,
    totalRepayment: (principalPaise + interestPaise) / 100,
  };
}
