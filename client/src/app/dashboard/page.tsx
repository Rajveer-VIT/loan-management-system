'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../types';

export default function DashboardIndexPage() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      switch (user.role) {
        case ROLES.SALES:
          router.replace('/dashboard/sales');
          break;
        case ROLES.SANCTION:
          router.replace('/dashboard/sanction');
          break;
        case ROLES.DISBURSEMENT:
          router.replace('/dashboard/disbursement');
          break;
        case ROLES.COLLECTION:
          router.replace('/dashboard/collection');
          break;
        case ROLES.ADMIN:
        default:
          router.replace('/dashboard/sales');
          break;
      }
    }
  }, [user, router]);

  return <div className="p-8 text-center text-sm text-gray-500">Redirecting to operations workspace...</div>;
}
