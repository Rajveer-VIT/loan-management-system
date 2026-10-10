'use client';

import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { StatCard } from '../../../components/dashboard/StatCard';
import { Table } from '../../../components/ui/Table';
import { Button } from '../../../components/ui/Button';
import { RejectModal } from '../../../components/dashboard/RejectModal';
import { Loan, ApiResponse } from '../../../types';
import { formatDate, formatCurrency } from '../../../lib/format';
import { api } from '../../../lib/api';
import { toast } from 'sonner';
import { CheckCircle, XCircle, FileText, Search, ShieldCheck } from 'lucide-react';
import { AxiosError } from 'axios';

export default function SanctionDashboardPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [selectedRejectLoan, setSelectedRejectLoan] = useState<Loan | null>(null);

  const fetchLoans = (p = 1, s = '') => {
    setIsLoading(true);
    api
      .get(`/sanction/loans?page=${p}&limit=10&search=${encodeURIComponent(s)}`)
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

  const handleApprove = async (loanId: string) => {
    try {
      const res = await api.patch(`/sanction/loans/${loanId}/approve`);
      if (res.data.success) {
        toast.success('Loan approved and sanctioned!');
        fetchLoans(page, search);
      }
    } catch (error: unknown) {
      const axiosErr = error as AxiosError<ApiResponse>;
      toast.error(axiosErr.response?.data?.message || 'Failed to sanction loan');
    }
  };

  const handleConfirmReject = async (reason: string) => {
    if (!selectedRejectLoan) return;
    const res = await api.patch(`/sanction/loans/${selectedRejectLoan._id}/reject`, {
      rejectionReason: reason,
    });
    if (res.data.success) {
      toast.success('Loan application rejected.');
      fetchLoans(page, search);
    }
  };

  const openSalarySlip = async (loanId: string) => {
    const token = localStorage.getItem('lms_token');
    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'}/loans/${loanId}/salary-slip`;
    
    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to view salary slip file');
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } catch (err: unknown) {
      toast.error('Could not load salary slip file');
    }
  };

  const columns = [
    {
      header: 'Applicant Profile',
      cell: (loan: Loan) => (
        <div>
          <p className="font-bold text-gray-900">{loan.personalDetails?.fullName || 'Borrower'}</p>
          <p className="text-xs text-gray-500 font-mono">PAN: {loan.personalDetails?.pan || '-'}</p>
          <p className="text-xs text-gray-500">
            Salary: ₹{loan.personalDetails?.monthlySalary?.toLocaleString('en-IN') || '-'} / mo
          </p>
        </div>
      ),
    },
    {
      header: 'Requested Loan Terms',
      cell: (loan: Loan) => (
        <div>
          <p className="font-bold text-gray-900">{formatCurrency(loan.amount)}</p>
          <p className="text-xs text-gray-500">
            {loan.tenureDays} Days • SI: {formatCurrency(loan.simpleInterest)}
          </p>
          <p className="text-xs font-semibold text-indigo-700">
            Total Repayment: {formatCurrency(loan.totalRepayment)}
          </p>
        </div>
      ),
    },
    {
      header: 'Salary Slip Doc',
      cell: (loan: Loan) =>
        loan.salarySlip ? (
          <button
            onClick={() => openSalarySlip(loan._id)}
            className="inline-flex items-center text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg transition-colors"
          >
            <FileText className="w-3.5 h-3.5 mr-1" /> View Slip
          </button>
        ) : (
          <span className="text-xs text-gray-400">Not uploaded</span>
        ),
    },
    {
      header: 'Submitted Date',
      cell: (loan: Loan) => formatDate(loan.createdAt),
    },
    {
      header: 'Underwriting Actions',
      cell: (loan: Loan) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleApprove(loan._id)}
          >
            <CheckCircle className="w-4 h-4 mr-1" /> Approve
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setSelectedRejectLoan(loan)}
          >
            <XCircle className="w-4 h-4 mr-1" /> Reject
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Underwriting & Sanction Queue"
        description="Review submitted loan applications, verify uploaded salary slips, and execute approve/reject decisions."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard
          title="Pending Sanction Queue"
          value={totalCount}
          description="APPLIED applications awaiting decision"
          icon={<ShieldCheck className="w-5 h-5 text-indigo-600" />}
        />
        <StatCard
          title="Total Principal Requested"
          value={formatCurrency(loans.reduce((sum, l) => sum + (l.amount || 0), 0))}
          description="In current queue view"
          icon={<FileText className="w-5 h-5 text-emerald-600" />}
        />
      </div>

      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
        <div className="relative max-w-sm w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by applicant name or PAN..."
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
        emptyMessage="No pending APPLIED loan applications in queue."
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

      {selectedRejectLoan && (
        <RejectModal
          isOpen={!!selectedRejectLoan}
          onClose={() => setSelectedRejectLoan(null)}
          onConfirm={handleConfirmReject}
          applicantName={selectedRejectLoan.personalDetails?.fullName || 'Borrower'}
        />
      )}
    </div>
  );
}
