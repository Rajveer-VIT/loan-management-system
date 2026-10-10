import { describe, it, expect } from 'vitest';
import { calculateLoanDetails, roundMoney } from '../services/loanCalculator.js';

// SI = (P × R × T) / (365 × 100), R = 12, T in days; Total = P + SI.
describe('calculateLoanDetails', () => {
  it.each([
    // [principal, days, expected SI, expected total]
    [100000, 365, 12000, 112000],
    [50000, 180, 2958.9, 52958.9], // 2958.904…
    [50000, 30, 493.15, 50493.15], // minimum terms: 493.150…
    [500000, 365, 60000, 560000], // maximum terms
    [500000, 30, 4931.51, 504931.51], // 4931.506… rounds up
    [150000, 180, 8876.71, 158876.71], // 8876.712…
    [123457, 77, 3125.32, 126582.32], // 114,074,268 / 36,500 = 3125.322…
  ])('P=%d, T=%d days → SI %d, total %d', (principal, days, si, total) => {
    const result = calculateLoanDetails(principal, days);
    expect(result).toEqual({
      amount: principal,
      tenureDays: days,
      interestRate: 12,
      simpleInterest: si,
      totalRepayment: total,
    });
  });

  it('matches the raw formula to within half a paisa for every tenure', () => {
    for (let days = 30; days <= 365; days++) {
      const raw = (275000 * 12 * days) / (365 * 100);
      const { simpleInterest, totalRepayment } = calculateLoanDetails(275000, days);
      expect(Math.abs(simpleInterest - raw)).toBeLessThanOrEqual(0.005 + 1e-9);
      expect(totalRepayment).toBe(roundMoney(275000 + simpleInterest));
    }
  });
});

describe('roundMoney', () => {
  it('rounds to 2 decimal places, half up', () => {
    expect(roundMoney(100.456)).toBe(100.46);
    expect(roundMoney(100.454)).toBe(100.45);
    expect(roundMoney(1.005)).toBe(1.01);
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
  });
});
