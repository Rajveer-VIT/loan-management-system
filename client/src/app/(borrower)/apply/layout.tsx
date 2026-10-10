'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Navbar } from '../../../components/layout/Navbar';
import { Stepper } from '../../../components/ui/Stepper';
import { Footer } from '../../../components/layout/Footer';

export default function ApplyLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const steps = [
    { id: 1, name: 'Personal Details' },
    { id: 2, name: 'Salary Slip' },
    { id: 3, name: 'Loan Config' },
  ];

  let currentStep = 1;
  if (pathname.includes('/salary-slip')) {
    currentStep = 2;
  } else if (pathname.includes('/loan-config')) {
    currentStep = 3;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-gray-100 shadow-xl space-y-8">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              Personal Loan Application
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Complete all steps to submit your application for instant underwriting review.
            </p>
          </div>

          <Stepper steps={steps} currentStep={currentStep} />

          <div>{children}</div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
