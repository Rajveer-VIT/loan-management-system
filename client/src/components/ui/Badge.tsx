import React from 'react';
import { LOAN_STATUS } from '../../types';

interface BadgeProps {
  status?: LOAN_STATUS | string;
  variant?: 'info' | 'success' | 'warning' | 'danger' | 'neutral';
  children?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ status, variant, children }) => {
  let style = 'bg-gray-100 text-gray-800 border-gray-200';
  let label = children || status;

  if (status) {
    switch (status) {
      case LOAN_STATUS.DRAFT:
        style = 'bg-gray-100 text-gray-700 border-gray-200';
        break;
      case LOAN_STATUS.APPLIED:
        style = 'bg-amber-50 text-amber-700 border-amber-200';
        break;
      case LOAN_STATUS.SANCTIONED:
        style = 'bg-indigo-50 text-indigo-700 border-indigo-200';
        break;
      case LOAN_STATUS.DISBURSED:
        style = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        break;
      case LOAN_STATUS.CLOSED:
        style = 'bg-blue-50 text-blue-700 border-blue-200';
        break;
      case LOAN_STATUS.REJECTED:
        style = 'bg-rose-50 text-rose-700 border-rose-200';
        break;
      default:
        style = 'bg-gray-100 text-gray-800 border-gray-200';
    }
  } else if (variant) {
    switch (variant) {
      case 'success':
        style = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        break;
      case 'warning':
        style = 'bg-amber-50 text-amber-700 border-amber-200';
        break;
      case 'danger':
        style = 'bg-rose-50 text-rose-700 border-rose-200';
        break;
      case 'info':
        style = 'bg-indigo-50 text-indigo-700 border-indigo-200';
        break;
      default:
        style = 'bg-gray-100 text-gray-700 border-gray-200';
    }
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style}`}
    >
      {label}
    </span>
  );
};
