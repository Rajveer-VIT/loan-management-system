import React from 'react';
import { Payment } from '../../types';
import { formatCurrency, formatDate } from '../../lib/format';
import { Table } from '../ui/Table';

interface PaymentHistoryProps {
  payments: Payment[];
  isLoading?: boolean;
}

export const PaymentHistory: React.FC<PaymentHistoryProps> = ({ payments, isLoading }) => {
  const columns = [
    {
      header: 'UTR Number',
      accessorKey: 'utrNumber' as const,
      cell: (p: Payment) => (
        <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded text-xs">
          {p.utrNumber}
        </span>
      ),
    },
    {
      header: 'Amount Paid',
      cell: (p: Payment) => (
        <span className="font-bold text-emerald-700">{formatCurrency(p.amount)}</span>
      ),
    },
    {
      header: 'Payment Date',
      cell: (p: Payment) => formatDate(p.paymentDate),
    },
    {
      header: 'Recorded By',
      cell: (p: Payment) => {
        const user = typeof p.recordedBy === 'object' ? p.recordedBy : null;
        return user ? user.name : 'Collector';
      },
    },
  ];

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-bold text-gray-900">Payment Audit Log</h4>
      <Table columns={columns} data={payments} isLoading={isLoading} emptyMessage="No payment history recorded yet." />
    </div>
  );
};
