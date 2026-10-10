'use client';

import React, { useState } from 'react';
import { FileUp, UserCheck, UserPlus, Users } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { StatCard } from '../../../components/dashboard/StatCard';
import { Column, Table } from '../../../components/ui/Table';
import { Badge, BadgeTone } from '../../../components/ui/Badge';
import { SearchInput } from '../../../components/ui/SearchInput';
import { Pagination } from '../../../components/ui/Pagination';
import { Alert } from '../../../components/ui/Alert';
import { useApiData, usePaginatedList } from '../../../hooks/useApi';
import { formatDate, formatDateTime } from '../../../lib/format';
import { Lead, LeadStage, SalesStats } from '../../../types';

const STAGES: Record<LeadStage, { label: string; tone: BadgeTone; hint: string }> = {
  REGISTERED: { label: 'Registered', tone: 'neutral', hint: 'Signed up, no details yet' },
  PROFILE_SAVED: { label: 'Eligibility passed', tone: 'info', hint: 'Passed BRE, slip pending' },
  SLIP_UPLOADED: { label: 'Slip uploaded', tone: 'warning', hint: 'Only loan terms left' },
};

const FILTERS: Array<{ value: LeadStage | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All leads' },
  { value: 'REGISTERED', label: 'Registered' },
  { value: 'PROFILE_SAVED', label: 'Eligibility passed' },
  { value: 'SLIP_UPLOADED', label: 'Slip uploaded' },
];

export default function SalesDashboardPage() {
  const [stage, setStage] = useState<LeadStage | 'ALL'>('ALL');
  const stats = useApiData<SalesStats>('/sales/stats');
  const list = usePaginatedList<Lead>('/sales/leads', { stage: stage === 'ALL' ? undefined : stage });

  const columns: Column<Lead>[] = [
    {
      header: 'Lead',
      cell: (lead) => (
        <div>
          <p className="font-medium text-slate-900">{lead.name}</p>
          <a href={`mailto:${lead.email}`} className="text-xs text-brand-700 hover:underline">
            {lead.email}
          </a>
        </div>
      ),
    },
    {
      header: 'Stage',
      cell: (lead) => (
        <div className="space-y-1">
          <Badge tone={STAGES[lead.stage].tone}>{STAGES[lead.stage].label}</Badge>
          <p className="hidden text-xs text-slate-500 sm:block">{STAGES[lead.stage].hint}</p>
        </div>
      ),
    },
    { header: 'Signed up', cell: (lead) => formatDate(lead.createdAt), hideOnMobile: true },
    { header: 'Last activity', cell: (lead) => formatDateTime(lead.lastActivityAt), hideOnMobile: true },
  ];

  const s = stats.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales — lead tracking"
        description="Borrowers who have registered but not yet submitted a loan application. They leave this list once they apply."
      />

      {stats.error && <Alert tone="danger">{stats.error}</Alert>}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard title="Open leads" value={s ? s.totalLeads : null} icon={<Users className="h-4 w-4" />} />
        <StatCard title="New today" value={s ? s.newLeadsToday : null} icon={<UserPlus className="h-4 w-4" />} />
        <StatCard
          title="Ready to apply"
          value={s ? s.funnel.SLIP_UPLOADED : null}
          description="Slip uploaded"
          icon={<FileUp className="h-4 w-4" />}
        />
        <StatCard
          title="Converted"
          value={s ? s.convertedBorrowers : null}
          description="Borrowers who applied"
          icon={<UserCheck className="h-4 w-4" />}
        />
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div role="group" aria-label="Filter by stage" className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={stage === f.value}
              onClick={() => setStage(f.value)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                stage === f.value ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-600 ring-slate-300 hover:bg-slate-50'
              }`}
            >
              {f.label}
              {s && f.value !== 'ALL' && <span className="ml-1.5 opacity-75">{s.funnel[f.value]}</span>}
            </button>
          ))}
        </div>
        <SearchInput value={list.search} onChange={list.setSearch} label="Search leads" placeholder="Search by name or email" />
      </div>

      {list.error && <Alert tone="danger">{list.error}</Alert>}
      <Table
        caption="Sales leads"
        columns={columns}
        data={list.items}
        getRowKey={(lead) => lead.id}
        isLoading={list.isLoading}
        emptyState={list.search ? 'No leads match your search.' : 'No open leads. Every registered borrower has applied.'}
      />
      <Pagination meta={list.meta} onPageChange={list.setPage} label="leads" />
    </div>
  );
}
