import React from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  tone?: 'brand' | 'current';
  label?: string;
  className?: string;
}

const SIZES = { sm: 'h-4 w-4 border-2', md: 'h-6 w-6 border-2', lg: 'h-10 w-10 border-[3px]' };

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', tone = 'brand', label = 'Loading', className = '' }) => (
  <span role="status" className={`inline-flex ${className}`}>
    <span
      aria-hidden="true"
      className={`inline-block animate-spin rounded-full border-solid border-t-transparent ${
        tone === 'brand' ? 'border-brand-600' : 'border-current'
      } ${SIZES[size]}`}
    />
    <span className="sr-only">{label}</span>
  </span>
);
