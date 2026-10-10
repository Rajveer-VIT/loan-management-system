import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, action }) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-6 border-b border-gray-100 gap-4">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">{title}</h1>
        {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};
