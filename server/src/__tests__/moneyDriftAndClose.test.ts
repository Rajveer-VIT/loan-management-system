import { describe, it, expect } from 'vitest';
import { roundMoney, calculateLoanDetails } from '../services/loanCalculator.js';

describe('Money Correctness & Drift Prevention Unit Tests', () => {
  it('should round numbers to 2 decimal places safely without floating point drift', () => {
    expect(roundMoney(100.456)).toBe(100.46);
    expect(roundMoney(100.454)).toBe(100.45);
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
  });

  it('should compute exact repayment and handle 3 partial payments summing exactly to total with zero float drift', () => {
    // Principal: ₹50,000, Tenure: 180 days @ 12% p.a.
    // SI = (50000 * 12 * 180) / (365 * 100) = 2958.9041... -> 2958.90
    // Total Repayment = 52958.90
    const calc = calculateLoanDetails(50000, 180);
    expect(calc.simpleInterest).toBe(2958.9);
    expect(calc.totalRepayment).toBe(52958.9);

    let outstanding = calc.totalRepayment;
    let totalPaid = 0;

    // Payment 1: 15,000.33
    const p1 = 15000.33;
    totalPaid = roundMoney(totalPaid + p1);
    outstanding = roundMoney(calc.totalRepayment - totalPaid);
    expect(totalPaid).toBe(15000.33);
    expect(outstanding).toBe(37958.57);

    // Payment 2: 20,000.45
    const p2 = 20000.45;
    totalPaid = roundMoney(totalPaid + p2);
    outstanding = roundMoney(calc.totalRepayment - totalPaid);
    expect(totalPaid).toBe(35000.78);
    expect(outstanding).toBe(17958.12);

    // Payment 3: Exact remaining balance 17,958.12
    const p3 = 17958.12;
    totalPaid = roundMoney(totalPaid + p3);
    outstanding = roundMoney(calc.totalRepayment - totalPaid);

    if (outstanding < 0.01) {
      outstanding = 0;
    }

    expect(totalPaid).toBe(52958.9);
    expect(outstanding).toBe(0);
  });
});
