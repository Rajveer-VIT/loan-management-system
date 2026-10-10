import React from 'react';
import { Brand } from '../layout/Navbar';

/** Shared two-column frame for the login and sign-up pages. */
export const AuthShell: React.FC<{ title: string; subtitle: string; aside: React.ReactNode; children: React.ReactNode }> = ({
  title,
  subtitle,
  aside,
  children,
}) => (
  <div className="flex min-h-screen bg-slate-50">
    <div className="hidden w-[44%] flex-col justify-between bg-slate-900 p-12 text-white lg:flex">
      <Brand inverted />
      <div className="max-w-md space-y-4">{aside}</div>
      <p className="text-xs text-slate-400">Loan Management System · demo environment</p>
    </div>
    <main id="main" className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
      <div className="w-full max-w-md space-y-6">
        <div className="lg:hidden">
          <Brand />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
        {children}
      </div>
    </main>
  </div>
);
