import { LOAN_CONFIG } from './loanConfig';

export interface CalculationResult {
  amount: number;
  tenureDays: number;
  interestRate: number;
  simpleInterest: number;
  totalRepayment: number;
}

/**
 * Live preview of SI = (P × R × T) / (365 × 100), computed in integer paise exactly like
 * the server so the figures shown match what the server stores.
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

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
