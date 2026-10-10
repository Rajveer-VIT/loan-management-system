'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Stepper } from '../../../components/ui/Stepper';

const STEPS = ['Personal details', 'Salary slip', 'Loan terms'];

function stepFor(pathname: string): number {
  if (pathname.includes('/salary-slip')) return 2;
  if (pathname.includes('/loan-config')) return 3;
  return 1;
}

export default function ApplyLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <Link href="/my-loans" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> My loans
      </Link>
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="space-y-5 border-b border-slate-200 p-5 sm:p-8">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Personal loan application</h1>
            <p className="mt-1 text-sm text-slate-500">Your progress is saved after each step, so you can come back later.</p>
          </div>
          <Stepper steps={STEPS} currentStep={stepFor(pathname)} />
        </div>
        <div className="p-5 sm:p-8">{children}</div>
      </div>
    </div>
  );
}
