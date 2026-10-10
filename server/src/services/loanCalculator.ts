import { LOAN_CONFIG } from '../constants/loanConfig.js';

export interface CalculationResult {
  amount: number;
  tenureDays: number;
  interestRate: number;
  simpleInterest: number;
  totalRepayment: number;
}

/**
 * Standard money rounding helper function.
 * Rounds floating point currency numbers to exactly 2 decimal places safely.
 */
export function roundMoney(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

// Backward-compatible alias
export const roundToTwoDecimals = roundMoney;

/**
 * Calculates simple interest and total repayment based on principal amount and tenure in days.
 * SI = (P * R * T) / (365 * 100)
 */
export function calculateLoanDetails(amount: number, tenureDays: number): CalculationResult {
  const rate = LOAN_CONFIG.INTEREST_RATE_PER_ANNUM;
  const rawInterest = (amount * rate * tenureDays) / (365 * 100);
  const simpleInterest = roundMoney(rawInterest);
  const totalRepayment = roundMoney(amount + simpleInterest);

  return {
    amount,
    tenureDays,
    interestRate: rate,
    simpleInterest,
    totalRepayment,
  };
}
