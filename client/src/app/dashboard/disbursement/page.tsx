'use client';

import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { StatCard } from '../../../components/dashboard/StatCard';
import { Table } from '../../../components/ui/Table';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { Loan, ApiResponse } from '../../../types';
import { formatDate, formatCurrency } from '../../../lib/format';
import { api } from '../../../lib/api';
import { toast } from 'sonner';
import { CreditCard, Search, CheckCircle2 } from 'lucide-react';
import { AxiosError } from 'axios';

export default function DisbursementDashboardPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [selectedDisburseLoan, setSelectedDisburseLoan] = useState<Loan | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchLoans = (p = 1, s = '') => {
    setIsLoading(true);
    api
      .get(`/disbursement/loans?page=${p}&limit=10&search=${encodeURIComponent(s)}`)
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

  const handleConfirmDisburse = async () => {
    if (!selectedDisburseLoan) return;
    setIsSubmitting(true);

    try {
      const res = await api.patch(`/disbursement/loans/${selectedDisburseLoan._id}/disburse`);
      if (res.data.success) {
        toast.success(`Loan funds of ${formatCurrency(selectedDisburseLoan.amount)} disbursed successfully!`);
        setSelectedDisburseLoan(null);
        fetchLoans(page, search);
      }
    } catch (error: unknown) {
      const axiosErr = error as AxiosError<ApiResponse>;
      toast.error(axiosErr.response?.data?.message || 'Failed to disburse loan');
    } finally {
      setIsSubmitting(false);
    }
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
      header: 'Approved Loan Principal',
      cell: (loan: Loan) => (
        <div>
          <p className="font-bold text-emerald-700 text-base">{formatCurrency(loan.amount)}</p>
          <p className="text-xs text-gray-500">{loan.tenureDays} Days Tenure</p>
        </div>
      ),
    },
    {
      header: 'Total Repayment Expected',
      cell: (loan: Loan) => (
        <div>
          <p className="font-bold text-gray-900">{formatCurrency(loan.totalRepayment)}</p>
          <p className="text-xs text-gray-500">Includes {formatCurrency(loan.simpleInterest)} Interest</p>
        </div>
      ),
    },
    {
      header: 'Sanction Date',
      cell: (loan: Loan) => formatDate(loan.sanctionedAt || loan.updatedAt),
    },
    {
      header: 'Disbursement Action',
      cell: (loan: Loan) => (
        <Button
          variant="primary"
          size="sm"
          onClick={() => setSelectedDisburseLoan(loan)}
        >
          <CreditCard className="w-4 h-4 mr-1.5" /> Mark Disbursed
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sanctioned Loan Disbursement Queue"
        description="Release approved loan funds to borrowers and activate repayment tracking."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard
          title="Sanctioned Loans Awaiting Funds"
          value={totalCount}
          description="Ready for immediate disbursement"
          icon={<CreditCard className="w-5 h-5 text-indigo-600" />}
        />
        <StatCard
          title="Total Capital to Disburse"
          value={formatCurrency(loans.reduce((sum, l) => sum + (l.amount || 0), 0))}
          description="Current queue total"
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
        emptyMessage="No SANCTIONED loans awaiting disbursement."
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

      {selectedDisburseLoan && (
        <Modal
          isOpen={!!selectedDisburseLoan}
          onClose={() => setSelectedDisburseLoan(null)}
          title="Confirm Fund Disbursement"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600 leading-relaxed">
              Are you sure you want to mark loan <strong>#{selectedDisburseLoan._id.slice(-8).toUpperCase()}</strong> for <strong>{selectedDisburseLoan.personalDetails?.fullName}</strong> as <strong>DISBURSED</strong>?
            </p>
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl space-y-1 text-xs text-emerald-900">
              <p className="font-bold">Disbursement Amount: {formatCurrency(selectedDisburseLoan.amount)}</p>
              <p>Status will transition to DISBURSED and repayment tracking will commence.</p>
            </div>

            <div className="flex justify-end space-x-3 pt-3">
              <Button variant="outline" onClick={() => setSelectedDisburseLoan(null)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleConfirmDisburse} isLoading={isSubmitting}>
                Confirm Disbursal
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
