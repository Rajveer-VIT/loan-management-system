import React from 'react';
import { Shield } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-gray-100 py-8 text-center text-xs text-gray-500">
      <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <Shield className="w-4 h-4 text-indigo-600" />
          <span className="font-semibold text-gray-700">FinFlow Loan Management Platform</span>
        </div>
        <p>© 2026 FinFlow LMS Monorepo. All rights reserved. Built with Next.js, Express & Mongoose.</p>
      </div>
    </footer>
  );
};
