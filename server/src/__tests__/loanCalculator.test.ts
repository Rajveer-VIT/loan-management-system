import { describe, it, expect } from 'vitest';
import { calculateLoanDetails, roundToTwoDecimals } from '../services/loanCalculator.js';

describe('Loan Calculator Unit Tests', () => {
  it('should round numbers to 2 decimal places correctly', () => {
    expect(roundToTwoDecimals(100.456)).toBe(100.46);
    expect(roundToTwoDecimals(100.454)).toBe(100.45);
    expect(roundToTwoDecimals(100)).toBe(100);
  });

  it('should compute simple interest and total repayment correctly for ₹100,000 at 12% p.a. for 365 days', () => {
    // SI = (100000 * 12 * 365) / (365 * 100) = 12000
    const result = calculateLoanDetails(100000, 365);
    expect(result.amount).toBe(100000);
    expect(result.tenureDays).toBe(365);
    expect(result.interestRate).toBe(12);
    expect(result.simpleInterest).toBe(12000);
    expect(result.totalRepayment).toBe(112000);
  });

  it('should compute simple interest and total repayment for 180 days', () => {
    // SI = (50000 * 12 * 180) / (365 * 100) = 2958.9041... -> 2958.90
    const result = calculateLoanDetails(50000, 180);
    expect(result.simpleInterest).toBe(2958.9);
    expect(result.totalRepayment).toBe(52958.9);
  });
});
