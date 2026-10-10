'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../types';
import {
  Users,
  CheckCircle,
  CreditCard,
  Receipt,
  LayoutDashboard,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user) return null;

  const role = user.role;

  const navItems = [
    {
      name: 'Sales Leads',
      href: '/dashboard/sales',
      icon: Users,
      allowedRoles: [ROLES.ADMIN, ROLES.SALES],
    },
    {
      name: 'Underwriting & Sanction',
      href: '/dashboard/sanction',
      icon: CheckCircle,
      allowedRoles: [ROLES.ADMIN, ROLES.SANCTION],
    },
    {
      name: 'Loan Disbursement',
      href: '/dashboard/disbursement',
      icon: CreditCard,
      allowedRoles: [ROLES.ADMIN, ROLES.DISBURSEMENT],
    },
    {
      name: 'Repayment & Collection',
      href: '/dashboard/collection',
      icon: Receipt,
      allowedRoles: [ROLES.ADMIN, ROLES.COLLECTION],
    },
  ];

  const filteredItems = navItems.filter(
    (item) => item.allowedRoles.includes(role as ROLES) || role === ROLES.ADMIN
  );

  return (
    <aside className="w-64 bg-white border-r border-gray-100 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between">
      <div className="space-y-6">
        <div className="px-3 py-2 bg-indigo-50/50 rounded-xl border border-indigo-100">
          <p className="text-xs font-semibold text-indigo-900 uppercase tracking-wider">
            Operations Workspace
          </p>
          <p className="text-xs text-indigo-600 font-medium mt-0.5 capitalize">
            Role: {role.toLowerCase()}
          </p>
        </div>

        <nav className="space-y-1">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-500 border border-gray-100">
        <p className="font-semibold text-gray-700">LMS Security Active</p>
        <p className="text-[11px] mt-0.5">Role-Based Access Enforcement Enabled</p>
      </div>
    </aside>
  );
};
