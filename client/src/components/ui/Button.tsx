import React from 'react';
import { Spinner } from './Spinner';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  className = '',
  ...props
}) => {
  const baseStyle =
    'inline-flex items-center justify-center font-medium transition-all duration-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm';

  const variants = {
    primary: 'bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-500 shadow-indigo-100',
    secondary: 'bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500 shadow-emerald-100',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500 shadow-rose-100',
    outline: 'border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 focus:ring-indigo-500',
    ghost: 'bg-transparent hover:bg-gray-100 text-gray-700 focus:ring-indigo-500 shadow-none',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs font-semibold',
    md: 'px-4 py-2.5 text-sm font-semibold',
    lg: 'px-6 py-3.5 text-base font-semibold',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <Spinner size="sm" className="mr-2 border-current text-white" />
          Processing...
        </>
      ) : (
        children
      )}
    </button>
  );
};
