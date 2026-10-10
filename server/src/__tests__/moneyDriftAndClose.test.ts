import { describe, it, expect } from 'vitest';
import { roundMoney, calculateLoanDetails } from '../services/loanCalculator.js';

describe('Repayment arithmetic', () => {
  it('three partial payments summing to the total leave exactly zero outstanding', () => {
    // ₹50,000 for 180 days @ 12% → SI 2958.90, total 52958.90
    const { totalRepayment } = calculateLoanDetails(50000, 180);
    expect(totalRepayment).toBe(52958.9);

    let totalPaid = 0;
    const balances: number[] = [];
    for (const amount of [15000.33, 20000.45, 17958.12]) {
      totalPaid = roundMoney(totalPaid + amount);
      balances.push(roundMoney(totalRepayment - totalPaid));
    }

    expect(balances).toEqual([37958.57, 17958.12, 0]);
    expect(totalPaid).toBe(totalRepayment);
  });
});
