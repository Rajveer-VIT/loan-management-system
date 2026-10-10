'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Landmark, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { homePathFor } from '../../lib/access';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ROLES } from '../../types';

const ROLE_LABELS: Record<ROLES, string> = {
  [ROLES.ADMIN]: 'Admin',
  [ROLES.SALES]: 'Sales',
  [ROLES.SANCTION]: 'Sanction',
  [ROLES.DISBURSEMENT]: 'Disbursement',
  [ROLES.COLLECTION]: 'Collection',
  [ROLES.BORROWER]: 'Borrower',
};

export const Brand: React.FC<{ href?: string; inverted?: boolean }> = ({ href = '/', inverted = false }) => (
  <Link href={href} className="flex items-center gap-2.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white" aria-hidden="true">
      <Landmark className="h-5 w-5" />
    </span>
    <span className={`text-lg font-bold tracking-tight ${inverted ? 'text-white' : 'text-slate-900'}`}>CreditSea</span>
  </Link>
);

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Brand href={user ? homePathFor(user.role) : '/'} />

        {user ? (
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold leading-tight text-slate-900">{user.name}</p>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>
            <Badge tone={user.role === ROLES.BORROWER ? 'success' : 'brand'}>{ROLE_LABELS[user.role]}</Badge>
            <Button variant="ghost" size="sm" onClick={handleLogout} aria-label="Log out">
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Log out</span>
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Log in
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">Apply now</Button>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};
