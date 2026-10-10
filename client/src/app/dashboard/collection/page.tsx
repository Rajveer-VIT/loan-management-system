'use client';

import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { StatCard } from '../../../components/dashboard/StatCard';
import { Table } from '../../../components/ui/Table';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { PaymentForm } from '../../../components/dashboard/PaymentForm';
import { PaymentHistory } from '../../../components/dashboard/PaymentHistory';
import { Loan, Payment, LOAN_STATUS } from '../../../types';
import { formatDate, formatCurrency } from '../../../lib/format';
import { api } from '../../../lib/api';
import { Receipt, Search, CheckCircle2, DollarSign, Wallet } from 'lucide-react';

interface PaymentSuccessResult {
  payment: Payment;
  loan: Loan;
  isClosed: boolean;
}

export default function CollectionDashboardPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [activeLoan, setActiveLoan] = useState<Loan | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);

  const fetchLoans = (p = 1, s = '') => {
    setIsLoading(true);
    api
      .get(`/collection/loans?page=${p}&limit=10&search=${encodeURIComponent(s)}`)
      .then((res) => {
        if (res.data.success) {
          setLoans(res.data.data);
          if (res.data.pagination) {
            setPage(res.data.pagination.page);
            setTotalPages(res.data.pagination.totalPages);
            setTotalCount(res.data.pagination.total);
          }
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchLoans(1, search);
  }, [search]);

  const loadPaymentHistory = async (loanId: string) => {
    setIsLoadingPayments(true);
    try {
      const res = await api.get(`/collection/loans/${loanId}/payments`);
      if (res.data.success) {
        setPayments(res.data.data.payments);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingPayments(false);
    }
  };

  const handleOpenRepaymentModal = (loan: Loan) => {
    setActiveLoan(loan);
    loadPaymentHistory(loan._id);
  };

  const handlePaymentSuccess = (result: PaymentSuccessResult) => {
    setActiveLoan(result.loan);
    loadPaymentHistory(result.loan._id);
    fetchLoans(page, search);
  };

  const columns = [
    {
      header: 'Borrower Name',
      cell: (loan: Loan) => (
        <div>
          <p className="font-bold text-gray-900">{loan.personalDetails?.fullName || 'Borrower'}</p>
          <p className="text-xs text-gray-500 font-mono">PAN: {loan.personalDetails?.pan || '-'}</p>
        </div>
      ),
    },
    {
      header: 'Status',
      cell: (loan: Loan) => <Badge status={loan.status} />,
    },
    {
      header: 'Total Repayment',
      cell: (loan: Loan) => (
        <span className="font-semibold text-gray-900">{formatCurrency(loan.totalRepayment)}</span>
      ),
    },
    {
      header: 'Total Paid',
      cell: (loan: Loan) => (
        <span className="font-bold text-emerald-700">{formatCurrency(loan.totalPaid)}</span>
      ),
    },
    {
      header: 'Outstanding Balance',
      cell: (loan: Loan) => (
        <span className={`font-bold ${loan.outstandingBalance > 0 ? 'text-rose-600' : 'text-gray-400'}`}>
          {formatCurrency(loan.outstandingBalance)}
        </span>
      ),
    },
    {
      header: 'Collection Actions',
      cell: (loan: Loan) => (
        <Button
          variant={loan.status === LOAN_STATUS.CLOSED ? 'outline' : 'primary'}
          size="sm"
          onClick={() => handleOpenRepaymentModal(loan)}
        >
          <Receipt className="w-4 h-4 mr-1.5" />
          {loan.status === LOAN_STATUS.CLOSED ? 'View History' : 'Record Repayment'}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Repayment & Collection Management"
        description="Record UTR payments against active disbursed loans and view automated loan closure records."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Active & Closed Portfolios"
          value={totalCount}
          description="Disbursed/Closed loans"
          icon={<Wallet className="w-5 h-5 text-indigo-600" />}
        />
        <StatCard
          title="Total Outstanding Receivables"
          value={formatCurrency(loans.reduce((sum, l) => sum + (l.outstandingBalance || 0), 0))}
          description="Pending collection"
          icon={<DollarSign className="w-5 h-5 text-rose-600" />}
        />
        <StatCard
          title="Total Collections Recovered"
          value={formatCurrency(loans.reduce((sum, l) => sum + (l.totalPaid || 0), 0))}
          description="Payments recorded"
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
        />
      </div>

      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
        <div className="relative max-w-sm w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by borrower name or PAN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <Table
        columns={columns}
        data={loans}
        isLoading={isLoading}
        emptyMessage="No DISBURSED or CLOSED loans found."
      />

      {totalPages > 1 && (
        <div className="flex justify-between items-center text-xs text-gray-500 pt-2">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => fetchLoans(page - 1, search)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => fetchLoans(page + 1, search)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {activeLoan && (
        <Modal
          isOpen={!!activeLoan}
          onClose={() => setActiveLoan(null)}
          title={`Repayment Portal: ${activeLoan.personalDetails?.fullName || 'Borrower'}`}
        >
          <div className="space-y-6">
            <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div>
                  <span className="text-xs text-slate-400 font-mono">
                    ID: #{activeLoan._id.slice(-8).toUpperCase()}
                  </span>
                  <p className="text-lg font-bold">{formatCurrency(activeLoan.totalRepayment)} Total Payable</p>
                </div>
                <Badge status={activeLoan.status} />
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block">Total Paid:</span>
                  <span className="text-sm font-bold text-emerald-400">
                    {formatCurrency(activeLoan.totalPaid)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Outstanding Balance:</span>
                  <span className="text-sm font-bold text-amber-300">
                    {formatCurrency(activeLoan.outstandingBalance)}
                  </span>
                </div>
              </div>

              {activeLoan.status === LOAN_STATUS.CLOSED && (
                <div className="bg-blue-900/60 border border-blue-400/40 p-3 rounded-xl flex items-center space-x-2 text-xs text-blue-200">
                  <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0" />
                  <span>
                    This loan has reached ₹0.00 outstanding balance and is <strong>FULLY CLOSED</strong>.
                  </span>
                </div>
              )}
            </div>

            {activeLoan.status === LOAN_STATUS.DISBURSED && (
              <PaymentForm
                loanId={activeLoan._id}
                outstandingBalance={activeLoan.outstandingBalance}
                onSuccess={handlePaymentSuccess}
              />
            )}

            <PaymentHistory payments={payments} isLoading={isLoadingPayments} />
          </div>
        </Modal>
      )}
    </div>
  );
}
