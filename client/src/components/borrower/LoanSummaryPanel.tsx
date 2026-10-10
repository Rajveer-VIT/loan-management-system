import React from 'react';
import { CalculationResult } from '../../lib/loanCalculator';
import { formatCurrency } from '../../lib/format';

/** Live repayment breakdown. aria-live announces updated totals as the sliders move. */
export const LoanSummaryPanel: React.FC<{ details: CalculationResult }> = ({ details }) => (
  <section aria-labelledby="loan-summary-heading" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <h3 id="loan-summary-heading" className="text-sm font-semibold text-slate-900">
      Repayment summary
    </h3>
    <dl className="mt-4 space-y-3 text-sm">
      <div className="flex justify-between">
        <dt className="text-slate-500">Principal (P)</dt>
        <dd className="font-medium tabular-nums text-slate-900">{formatCurrency(details.amount)}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-slate-500">Interest rate (R)</dt>
        <dd className="font-medium text-slate-900">{details.interestRate}% p.a.</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-slate-500">Tenure (T)</dt>
        <dd className="font-medium text-slate-900">{details.tenureDays} days</dd>
      </div>
      <div className="flex justify-between border-t border-slate-100 pt-3">
        <dt className="text-slate-500">Simple interest</dt>
        <dd className="font-medium tabular-nums text-slate-900" aria-live="polite">
          {formatCurrency(details.simpleInterest)}
        </dd>
      </div>
    </dl>
    <div className="mt-4 flex items-baseline justify-between rounded-lg bg-brand-50 px-4 py-3">
      <span className="text-sm font-medium text-brand-900">Total repayment</span>
      <span className="text-xl font-semibold tabular-nums text-brand-900" aria-live="polite">
        {formatCurrency(details.totalRepayment)}
      </span>
    </div>
    <p className="mt-3 text-xs text-slate-500">
      SI = (P × R × T) / (365 × 100). Figures are re-calculated by our server when you apply.
    </p>
  </section>
);
