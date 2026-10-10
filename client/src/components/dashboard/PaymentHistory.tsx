import React from 'react';
import { Payment } from '../../types';
import { formatCalendarDate, formatCurrency, formatDateTime } from '../../lib/format';
import { actorName } from './LoanDetails';

interface PaymentHistoryProps {
  payments: Payment[];
  showRecordedBy?: boolean;
}

export const PaymentHistory: React.FC<PaymentHistoryProps> = ({ payments, showRecordedBy = true }) => (
  <section aria-labelledby="payment-history-heading">
    <h3 id="payment-history-heading" className="mb-2 text-sm font-semibold text-slate-900">
      Payment history
    </h3>
    {payments.length === 0 ? (
      <p className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">No payments recorded yet.</p>
    ) : (
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Payments recorded against this loan</caption>
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" className="px-3 py-2 font-semibold">UTR</th>
              <th scope="col" className="px-3 py-2 font-semibold">Amount</th>
              <th scope="col" className="px-3 py-2 font-semibold">Paid on</th>
              {showRecordedBy && <th scope="col" className="hidden px-3 py-2 font-semibold sm:table-cell">Recorded</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {payments.map((p) => (
              <tr key={p._id}>
                <td className="px-3 py-2 font-mono text-xs text-slate-800">{p.utrNumber}</td>
                <td className="px-3 py-2 font-medium tabular-nums text-slate-900">{formatCurrency(p.amount)}</td>
                <td className="px-3 py-2 text-slate-600">{formatCalendarDate(p.paymentDate)}</td>
                {showRecordedBy && (
                  <td className="hidden px-3 py-2 text-xs text-slate-500 sm:table-cell">
                    {formatDateTime(p.createdAt)}
                    {actorName(p.recordedBy) && <> by {actorName(p.recordedBy)}</>}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </section>
);
