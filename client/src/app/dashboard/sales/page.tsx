'use client';

import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { StatCard } from '../../../components/dashboard/StatCard';
import { Table } from '../../../components/ui/Table';
import { Badge } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Lead } from '../../../types';
import { formatDate, formatCurrency } from '../../../lib/format';
import { api } from '../../../lib/api';
import { Users, Search, Filter } from 'lucide-react';

export default function SalesDashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLeads, setTotalLeads] = useState(0);

  const fetchLeads = (p = 1, s = '') => {
    setIsLoading(true);
    api
      .get(`/sales/leads?page=${p}&limit=10&search=${encodeURIComponent(s)}`)
      .then((res) => {
        if (res.data.success) {
          setLeads(res.data.data);
          if (res.data.pagination) {
            setPage(res.data.pagination.page);
            setTotalPages(res.data.pagination.totalPages);
            setTotalLeads(res.data.pagination.total);
          }
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchLeads(1, search);
  }, [search]);

  const columns = [
    {
      header: 'Borrower Name',
      accessorKey: 'name' as const,
      cell: (lead: Lead) => (
        <div>
          <p className="font-bold text-gray-900">{lead.name}</p>
          <p className="text-xs text-gray-500">{lead.email}</p>
        </div>
      ),
    },
    {
      header: 'Signup Date',
      cell: (lead: Lead) => formatDate(lead.createdAt),
    },
    {
      header: 'Funnel Progress Stage',
      cell: (lead: Lead) => {
        let variant: 'info' | 'success' | 'warning' | 'danger' | 'neutral' = 'neutral';
        if (lead.stage === 'REGISTERED') variant = 'neutral';
        if (lead.stage === 'PROFILE_SAVED') variant = 'info';
        if (lead.stage === 'SLIP_UPLOADED') variant = 'warning';
        if (['APPLIED', 'SANCTIONED', 'DISBURSED', 'CLOSED'].includes(lead.stage)) variant = 'success';

        return <Badge variant={variant}>{lead.stage.replace('_', ' ')}</Badge>;
      },
    },
    {
      header: 'Associated Loan Amount',
      cell: (lead: Lead) =>
        lead.loanAmount ? (
          <span className="font-bold text-gray-900">{formatCurrency(lead.loanAmount)}</span>
        ) : (
          <span className="text-gray-400 text-xs">-</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Lead Funnel Tracking"
        description="Monitor registered borrowers and track application completion stages."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Registered Leads"
          value={totalLeads}
          description="Borrower accounts created"
          icon={<Users className="w-5 h-5" />}
        />
        <StatCard
          title="Active Funnel Leads"
          value={leads.filter((l) => ['PROFILE_SAVED', 'SLIP_UPLOADED'].includes(l.stage)).length}
          description="Incomplete draft applications"
          icon={<Filter className="w-5 h-5" />}
        />
        <StatCard
          title="Submitted Applications"
          value={leads.filter((l) => l.stage === 'APPLIED').length}
          description="Ready for Sanction review"
          icon={<Users className="w-5 h-5 text-emerald-600" />}
        />
      </div>

      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
        <div className="relative max-w-sm w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by lead name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <Table columns={columns} data={leads} isLoading={isLoading} emptyMessage="No sales leads found matching search criteria." />

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
              onClick={() => fetchLeads(page - 1, search)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => fetchLeads(page + 1, search)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
