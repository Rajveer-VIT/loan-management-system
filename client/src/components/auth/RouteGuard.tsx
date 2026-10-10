'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { canAccessPath } from '../../lib/access';
import { Spinner } from '../ui/Spinner';

/**
 * Client-side route protection: anonymous users go to /login (and come back afterwards),
 * users whose role may not view this path go to /unauthorized. Children are not rendered
 * until access is confirmed, so no protected data is requested by unauthorized users.
 * The API enforces the same rules independently.
 */
export const RouteGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuth();

  const allowed = !!user && canAccessPath(user.role, pathname);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    } else if (!allowed) {
      router.replace('/unauthorized');
    }
  }, [isLoading, user, allowed, pathname, router]);

  if (isLoading || !allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50" aria-busy="true">
        <Spinner size="lg" label="Checking access" />
      </div>
    );
  }

  return <>{children}</>;
};
