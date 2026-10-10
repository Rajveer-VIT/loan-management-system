'use client';

import React from 'react';
import { RouteGuard } from '../../components/auth/RouteGuard';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';

/** Borrower portal shell: borrowers only (staff and anonymous users are redirected). */
export default function BorrowerLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard>
      <div className="flex min-h-screen flex-col bg-slate-50">
        <Navbar />
        <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
          {children}
        </main>
        <Footer />
      </div>
    </RouteGuard>
  );
}
