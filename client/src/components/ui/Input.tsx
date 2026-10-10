import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-150 ${
            error ? 'border-rose-500 focus:ring-rose-500 focus:border-rose-500' : ''
          } ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-xs font-medium text-rose-600">{error}</p>}
        {!error && helperText && <p className="mt-1 text-xs text-gray-500">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
