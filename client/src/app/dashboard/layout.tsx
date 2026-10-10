'use client';

import React from 'react';
import { RouteGuard } from '../../components/auth/RouteGuard';
import { Navbar } from '../../components/layout/Navbar';
import { MobileModuleNav, Sidebar } from '../../components/layout/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard>
      <div className="flex min-h-screen flex-col bg-slate-50">
        <Navbar />
        <MobileModuleNav />
        <div className="mx-auto flex w-full max-w-7xl flex-1">
          <Sidebar />
          <main id="main" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </main>
        </div>
      </div>
    </RouteGuard>
  );
}
