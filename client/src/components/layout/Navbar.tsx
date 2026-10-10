'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Shield, LogOut, User as UserIcon } from 'lucide-react';
import { ROLES } from '../../types';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-100">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-black text-gray-900 tracking-tight">FinFlow</span>
              <span className="text-xs font-semibold text-indigo-600 block -mt-1 uppercase tracking-widest">
                LMS Platform
              </span>
            </div>
          </Link>

          {/* User Nav Actions */}
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-gray-900 leading-none">{user.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{user.email}</p>
                </div>
                <Badge status={user.role as any}>{user.role}</Badge>
                {user.role === ROLES.BORROWER ? (
                  <Link href="/my-loans">
                    <Button variant="outline" size="sm">
                      My Loans
                    </Button>
                  </Link>
                ) : (
                  <Link href="/dashboard">
                    <Button variant="outline" size="sm">
                      Dashboard
                    </Button>
                  </Link>
                )}
                <button
                  onClick={logout}
                  className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                  title="Log Out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Log In
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button variant="primary" size="sm">
                    Apply Now
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
