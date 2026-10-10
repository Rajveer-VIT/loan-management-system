import React from 'react';
import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <main id="main" className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold text-brand-700">404</p>
        <h1 className="text-xl font-semibold text-slate-900">Page not found</h1>
        <p className="text-sm text-slate-500">The page you’re looking for doesn’t exist or has moved.</p>
        <Link
          href="/"
          className="inline-flex h-10 items-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
