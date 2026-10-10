'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { homePathFor } from '../../lib/access';
import { Button } from '../../components/ui/Button';

export default function UnauthorizedPage() {
  const { user } = useAuth();
  const home = user ? homePathFor(user.role) : '/login';

  return (
    <main id="main" className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md space-y-5 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <ShieldAlert className="mx-auto h-10 w-10 text-rose-600" aria-hidden="true" />
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-slate-900">You don’t have access to this page</h1>
          <p className="text-sm text-slate-500">
            {user
              ? 'Your role can only open its own area of the system. Ask an administrator if you need access.'
              : 'Please log in to continue.'}
          </p>
        </div>
        <Link href={home}>
          <Button>{user ? 'Go to my workspace' : 'Log in'}</Button>
        </Link>
      </div>
    </main>
  );
}
