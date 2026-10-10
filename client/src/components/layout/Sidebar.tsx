'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CreditCard, FileCheck2, LayoutDashboard, Receipt, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { DashboardModule, modulesFor } from '../../lib/access';
import { ROLES } from '../../types';

const ICONS: Record<DashboardModule, React.ElementType> = {
  sales: Users,
  sanction: FileCheck2,
  disbursement: CreditCard,
  collection: Receipt,
};

/** Only the modules the user's role can use are listed (the API enforces the same). */
function useNavItems() {
  const { user } = useAuth();
  if (!user) return [];
  const items = modulesFor(user.role).map((m) => ({ href: m.href, label: m.label, icon: ICONS[m.key] }));
  if (user.role === ROLES.ADMIN) {
    items.unshift({ href: '/dashboard', label: 'Overview', icon: LayoutDashboard });
  }
  return items;
}

function isActive(pathname: string, href: string) {
  return href === '/dashboard' ? pathname === href : pathname.startsWith(href);
}

/** Vertical navigation for large screens. */
export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const items = useNavItems();

  return (
    <aside className="hidden w-60 flex-shrink-0 border-r border-slate-200 bg-white lg:block">
      <nav aria-label="Operations modules" className="sticky top-16 space-y-1 p-4">
        <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Operations</p>
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                active ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

/** Horizontal, scrollable tab bar for small screens. */
export const MobileModuleNav: React.FC = () => {
  const pathname = usePathname();
  const items = useNavItems();
  if (items.length <= 1) return null;

  return (
    <nav aria-label="Operations modules" className="border-b border-slate-200 bg-white lg:hidden">
      <div className="flex gap-1 overflow-x-auto px-4 py-2">
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium ${
                active ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
