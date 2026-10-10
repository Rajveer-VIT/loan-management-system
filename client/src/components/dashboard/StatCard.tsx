import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  description,
  icon,
  trend,
}) => {
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          {title}
        </span>
        {icon && (
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">{icon}</div>
        )}
      </div>
      <div className="mt-3">
        <h3 className="text-2xl font-black text-gray-900 tracking-tight">{value}</h3>
        {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
      </div>
    </div>
  );
};
