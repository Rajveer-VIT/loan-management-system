'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, FileText, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { Button } from '../components/ui/Button';
import { Slider } from '../components/ui/Slider';
import { LoanSummaryPanel } from '../components/borrower/LoanSummaryPanel';
import { calculateLoanDetails } from '../lib/loanCalculator';
import { LOAN_CONFIG } from '../lib/loanConfig';
import { formatRupees } from '../lib/format';

const STEPS = [
  { icon: ShieldCheck, title: 'Check eligibility', body: 'Share your PAN, date of birth, salary and employment. Eligibility is checked instantly (age 23–50, salary ≥ ₹25,000).' },
  { icon: FileText, title: 'Upload salary slip', body: 'Add your latest salary slip as a PDF, JPG or PNG (up to 5 MB) for income verification.' },
  { icon: SlidersHorizontal, title: 'Choose your terms', body: 'Pick ₹50,000–₹5,00,000 over 30–365 days. Simple interest at a fixed 12% p.a., shown before you apply.' },
];

export default function LandingPage() {
  const [amount, setAmount] = useState(100000);
  const [tenureDays, setTenureDays] = useState(180);
  const preview = calculateLoanDetails(amount, tenureDays);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />
      <main id="main" className="flex-1">
        <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-20">
          <div className="space-y-6">
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              Personal loans with clear, simple interest.
            </h1>
            <p className="max-w-xl text-lg text-slate-600">
              Borrow {formatRupees(LOAN_CONFIG.MIN_AMOUNT)} to {formatRupees(LOAN_CONFIG.MAX_AMOUNT)} for {LOAN_CONFIG.MIN_TENURE_DAYS}–
              {LOAN_CONFIG.MAX_TENURE_DAYS} days at a fixed {LOAN_CONFIG.INTEREST_RATE_PER_ANNUM}% p.a. You see the exact repayment before you apply.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/signup">
                <Button size="lg" className="w-full sm:w-auto">
                  Apply now <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Log in
                </Button>
              </Link>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-base font-semibold text-slate-900">Repayment calculator</h2>
            <Slider
              label="Loan amount"
              value={amount}
              min={LOAN_CONFIG.MIN_AMOUNT}
              max={LOAN_CONFIG.MAX_AMOUNT}
              step={LOAN_CONFIG.AMOUNT_STEP}
              onChange={setAmount}
              format={formatRupees}
              unitLabel="₹"
            />
            <Slider
              label="Tenure"
              value={tenureDays}
              min={LOAN_CONFIG.MIN_TENURE_DAYS}
              max={LOAN_CONFIG.MAX_TENURE_DAYS}
              step={1}
              onChange={setTenureDays}
              format={(d) => `${d} days`}
              unitLabel="days"
            />
            <LoanSummaryPanel details={preview} />
          </div>
        </section>

        <section className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-semibold text-slate-900">How it works</h2>
            <ol className="mt-8 grid gap-6 md:grid-cols-3">
              {STEPS.map(({ icon: Icon, title, body }, i) => (
                <li key={title} className="rounded-xl border border-slate-200 p-6">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700" aria-hidden="true">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Step {i + 1}</span>
                  </div>
                  <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
