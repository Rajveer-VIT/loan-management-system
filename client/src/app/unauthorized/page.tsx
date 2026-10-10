'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black text-gray-900">403 - Access Denied</h1>
          <p className="text-xs text-gray-500 leading-relaxed">
            You do not have the required role permissions to access this internal dashboard module. Borrowers are restricted from accessing operational executive pages.
          </p>
        </div>

        <div className="pt-2 flex justify-center space-x-3">
          <Link href="/my-loans">
            <Button variant="primary">
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Return to Borrower Portal
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
