'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Loan, LOAN_STATUS } from '@/types';
import { formatCurrency, formatDate } from '@/lib/format';
import { api } from '@/lib/api';
import { CheckCircle2, Clock, AlertTriangle, ArrowRight } from 'lucide-react';

export default function MyLoansPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    api
      .get('/borrower/loans')
      .then((res: any) => {
        if (res.data.success) {
          setLoans(res.data.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const getTimelineStep = (status: LOAN_STATUS) => {
    switch (status) {
      case LOAN_STATUS.DRAFT:
        return 0;
      case LOAN_STATUS.APPLIED:
        return 1;
      case LOAN_STATUS.SANCTIONED:
        return 2;
      case LOAN_STATUS.DISBURSED:
        return 3;
      case LOAN_STATUS.CLOSED:
        return 4;
      case LOAN_STATUS.REJECTED:
        return -1;
      default:
        return 0;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <PageHeader
          title="My Loan Applications & Repayment Portal"
          description="Track status timeline, view calculation details, and monitor repayment progress."
          action={
            <Link href="/apply/personal-details">
              <Button variant="primary" size="sm">
                + New Application
              </Button>
            </Link>
          }
        />

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        ) : loans.length === 0 ? (
          <EmptyState
            title="No loan applications found"
            description="You have not submitted any loan applications yet. Apply now to get instant eligibility approval."
            action={
              <Link href="/apply/personal-details">
                <Button variant="primary">Apply for a Loan</Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-6">
            {loans.map((loan) => {
              const currentStep = getTimelineStep(loan.status);
              const repaymentPercent =
                loan.totalRepayment > 0
                  ? Math.min(100, Math.round((loan.totalPaid / loan.totalRepayment) * 100))
                  : 0;

              return (
                <Card key={loan._id} className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold text-gray-400">
                          ID: {loan._id.slice(-8).toUpperCase()}
                        </span>
                        <Badge status={loan.status} />
                      </div>
                      <h3 className="text-xl font-black text-gray-900 mt-1">
                        {formatCurrency(loan.amount)}
                        <span className="text-xs font-normal text-gray-500 ml-2">
                          for {loan.tenureDays} Days @ 12% p.a.
                        </span>
                      </h3>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Applied On</p>
                      <p className="text-sm font-semibold text-gray-700">{formatDate(loan.createdAt)}</p>
                    </div>
                  </div>

                  {/* Status Timeline Progress Bar */}
                  {loan.status !== LOAN_STATUS.REJECTED ? (
                    <div className="py-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                        Status Timeline
                      </p>
                      <div className="grid grid-cols-4 gap-2 text-center relative">
                        {[
                          { title: 'Applied', step: 1 },
                          { title: 'Sanctioned', step: 2 },
                          { title: 'Disbursed', step: 3 },
                          { title: 'Closed', step: 4 },
                        ].map((s) => {
                          const isDone = currentStep >= s.step;
                          const isCurrent = currentStep === s.step;

                          return (
                            <div
                              key={s.step}
                              className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                                isDone
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                  : isCurrent
                                  ? 'bg-indigo-50 border-indigo-200 text-indigo-800 ring-2 ring-indigo-100'
                                  : 'bg-gray-50 border-gray-100 text-gray-400'
                              }`}
                            >
                              <div className="flex justify-center mb-1">
                                {isDone ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                ) : (
                                  <Clock className="w-4 h-4 text-gray-400" />
                                )}
                              </div>
                              {s.title}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-800 space-y-1">
                      <div className="flex items-center space-x-2 font-bold text-xs">
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        <span>Application Rejected by Underwriting</span>
                      </div>
                      <p className="text-xs text-rose-700 font-medium">
                        Reason: {loan.rejectionReason || 'Did not meet credit policy criteria'}
                      </p>
                    </div>
                  )}

                  {/* Repayment Progress (For Disbursed or Closed Loans) */}
                  {(loan.status === LOAN_STATUS.DISBURSED || loan.status === LOAN_STATUS.CLOSED) && (
                    <div className="bg-gray-50 p-4 rounded-xl space-y-2 border border-gray-100">
                      <div className="flex justify-between text-xs font-bold text-gray-700">
                        <span>Repayment Progress ({repaymentPercent}%)</span>
                        <span>
                          Paid {formatCurrency(loan.totalPaid)} of {formatCurrency(loan.totalRepayment)}
                        </span>
                      </div>
                      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 transition-all duration-300"
                          style={{ width: `${repaymentPercent}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 pt-1">
                        <span>Outstanding Balance:</span>
                        <span className="font-bold text-gray-900">
                          {formatCurrency(loan.outstandingBalance)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Complete Draft button if DRAFT */}
                  {loan.status === LOAN_STATUS.DRAFT && (
                    <div className="flex justify-end">
                      <Link href="/apply/personal-details">
                        <Button variant="primary" size="sm">
                          Resume Application <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
