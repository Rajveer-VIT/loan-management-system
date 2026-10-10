import React from 'react';
import { formatCurrency } from '../../lib/format';
import { CalculationResult } from '../../lib/loanCalculator';
import { ShieldCheck, Calendar, Percent, Banknote } from 'lucide-react';

interface LoanSummaryPanelProps {
  details: CalculationResult;
}

export const LoanSummaryPanel: React.FC<LoanSummaryPanelProps> = ({ details }) => {
  return (
    <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-indigo-950 text-white rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex items-center justify-between border-b border-indigo-700/50 pb-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-200">
            Loan Summary
          </span>
          <h3 className="text-xl font-black tracking-tight text-white mt-0.5">
            Calculation Breakup
          </h3>
        </div>
        <div className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-bold flex items-center">
          <ShieldCheck className="w-3.5 h-3.5 mr-1" /> 12% Fixed P.A.
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-indigo-200 flex items-center">
            <Banknote className="w-4 h-4 mr-1.5 text-indigo-400" /> Principal Amount
          </span>
          <span className="text-base font-bold text-white">
            {formatCurrency(details.amount)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-indigo-200 flex items-center">
            <Percent className="w-4 h-4 mr-1.5 text-indigo-400" /> Fixed Interest Rate
          </span>
          <span className="text-sm font-bold text-white">12.00% p.a.</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-indigo-200 flex items-center">
            <Calendar className="w-4 h-4 mr-1.5 text-indigo-400" /> Tenure Duration
          </span>
          <span className="text-sm font-bold text-white">{details.tenureDays} Days</span>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-indigo-700/40">
          <span className="text-xs text-indigo-200">Total Interest (SI)</span>
          <span className="text-sm font-bold text-emerald-400">
            + {formatCurrency(details.simpleInterest)}
          </span>
        </div>
      </div>

      <div className="pt-4 border-t border-indigo-700/50 bg-indigo-950/50 -mx-6 -mb-6 p-6 rounded-b-2xl flex items-center justify-between">
        <div>
          <span className="text-xs text-indigo-300 font-semibold uppercase tracking-wider block">
            Total Repayment
          </span>
          <span className="text-2xl font-black text-white tracking-tight">
            {formatCurrency(details.totalRepayment)}
          </span>
        </div>
      </div>
    </div>
  );
};
