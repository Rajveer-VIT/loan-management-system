'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { Button } from '../components/ui/Button';
import { Slider } from '../components/ui/Slider';
import { calculateLoanDetails } from '../lib/loanCalculator';
import { formatCurrency } from '../lib/format';
import { ShieldCheck, Zap, Award, ArrowRight, CheckCircle2, Clock, Banknote, HelpCircle, ChevronDown } from 'lucide-react';

export default function LandingPage() {
  const [amount, setAmount] = useState(100000);
  const [tenureDays, setTenureDays] = useState(180);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const calc = calculateLoanDetails(amount, tenureDays);

  const faqs = [
    {
      q: 'What is the fixed interest rate on FinFlow loans?',
      a: 'All FinFlow personal loans feature a transparent fixed interest rate of 12.00% per annum calculated strictly via simple interest.',
    },
    {
      q: 'How does the Business Rule Engine (BRE) evaluate my profile?',
      a: 'Our server-side BRE checks your age (23-50 years), net monthly salary (min ₹25,000), PAN card format, and salaried/self-employed status instantly upon submission.',
    },
    {
      q: 'Are there any hidden fees or pre-closure penalties?',
      a: 'Zero hidden fees, zero processing charges, and zero early repayment penalties. You pay only the principal plus simple interest.',
    },
    {
      q: 'How fast are approved loans disbursed?',
      a: 'Once approved by our Underwriting team, funds are marked as disbursed by our Disbursement department on the same business day.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-700 text-xs font-bold">
                <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span>Automated BRE Underwriting • Instant Approval</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-none">
                Instant Personal Loans. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-indigo-700 to-emerald-600">
                  Zero Hassle. 12% P.A.
                </span>
              </h1>

              <p className="text-lg text-slate-600 max-w-xl font-normal leading-relaxed">
                Get funded up to ₹5,00,000 in under 24 hours. Transparent simple interest calculation with no hidden charges or surprise penalties.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                <Link href="/signup">
                  <Button variant="primary" size="lg" className="w-full sm:w-auto shadow-indigo-200">
                    Apply for Loan Now <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    Track Existing Loan
                  </Button>
                </Link>
              </div>

              {/* Trust Badges */}
              <div className="pt-6 grid grid-cols-3 gap-4 border-t border-slate-200/80">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <span className="text-xs font-semibold text-slate-700">100% Paperless</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                  <span className="text-xs font-semibold text-slate-700">Same-Day Disbursal</span>
                </div>
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <span className="text-xs font-semibold text-slate-700">ISO 27001 Secure</span>
                </div>
              </div>
            </div>

            {/* Right Interactive Mini EMI / Interest Preview Calculator */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-100 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Loan Repayment Calculator</h3>
                    <p className="text-xs text-slate-500">Live preview at 12% fixed p.a.</p>
                  </div>
                  <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Banknote className="w-6 h-6" />
                  </span>
                </div>

                <div className="space-y-6">
                  <Slider
                    label="Desired Loan Amount"
                    prefix="₹"
                    value={amount}
                    min={50000}
                    max={500000}
                    step={5000}
                    onChange={setAmount}
                  />

                  <Slider
                    label="Tenure Duration"
                    unit=" Days"
                    value={tenureDays}
                    min={30}
                    max={365}
                    step={5}
                    onChange={setTenureDays}
                  />
                </div>

                <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-3">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>Principal Amount:</span>
                    <span className="font-bold text-white tabular-nums">{formatCurrency(calc.amount)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>Simple Interest (12%):</span>
                    <span className="font-bold text-emerald-400 tabular-nums">+ {formatCurrency(calc.simpleInterest)}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex justify-between items-baseline">
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Total Payable:</span>
                    <span className="text-2xl font-black text-white tabular-nums">{formatCurrency(calc.totalRepayment)}</span>
                  </div>
                </div>

                <Link href="/signup" className="block">
                  <Button variant="primary" className="w-full">
                    Proceed with {formatCurrency(amount)}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-16 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">How FinFlow Works</h2>
            <p className="text-sm text-slate-500">Simple 3-step paperless application process</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 relative space-y-4">
              <div className="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-bold text-lg shadow-md shadow-indigo-100">
                1
              </div>
              <h3 className="text-lg font-bold text-slate-900">Fill Personal Details</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Provide your PAN, Date of Birth, and Monthly Salary. Our automated Business Rule Engine (BRE) verifies eligibility instantly.
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 relative space-y-4">
              <div className="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-bold text-lg shadow-md shadow-indigo-100">
                2
              </div>
              <h3 className="text-lg font-bold text-slate-900">Upload Salary Slip</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Drag and drop your latest PDF or image salary slip. Staff underwriters review and sanction approved amounts quickly.
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 relative space-y-4">
              <div className="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-bold text-lg shadow-md shadow-indigo-100">
                3
              </div>
              <h3 className="text-lg font-bold text-slate-900">Get Funded & Repay</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Upon disbursement, track outstanding balances on your portal and make repayments seamlessly via UTR tracking.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 space-y-2">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center justify-center">
              <HelpCircle className="w-7 h-7 mr-2 text-indigo-600" /> Frequently Asked Questions
            </h2>
            <p className="text-sm text-slate-500">Everything you need to know about our personal loans</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full px-6 py-4 text-left font-bold text-slate-900 text-sm flex items-center justify-between focus:outline-none"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-4 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
