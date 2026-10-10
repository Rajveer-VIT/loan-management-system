import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLElement> {
  as?: 'div' | 'section' | 'article';
}

export const Card: React.FC<CardProps> = ({ as: Tag = 'div', className = '', children, ...props }) => (
  <Tag className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 ${className}`} {...props}>
    {children}
  </Tag>
);
