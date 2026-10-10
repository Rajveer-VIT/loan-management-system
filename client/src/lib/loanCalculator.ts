export interface CalculationResult {
  amount: number;
  tenureDays: number;
  interestRate: number;
  simpleInterest: number;
  totalRepayment: number;
}

export function roundToTwoDecimals(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

export function calculateLoanDetails(amount: number, tenureDays: number): CalculationResult {
  const rate = 12; // 12% p.a.
  const rawInterest = (amount * rate * tenureDays) / (365 * 100);
  const simpleInterest = roundToTwoDecimals(rawInterest);
  const totalRepayment = roundToTwoDecimals(amount + simpleInterest);

  return {
    amount,
    tenureDays,
    interestRate: rate,
    simpleInterest,
    totalRepayment,
  };
}
