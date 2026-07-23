import React from 'react';

export interface StatisticsCardProps {
  title: string;
  value: string;
  change?: string;
}

export default function StatisticsCard({ title, value, change }: StatisticsCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="mt-3 text-3xl font-bold text-gray-900">{value}</p>
      {change && <p className="mt-2 text-sm text-green-600">{change}</p>}
    </div>
  );
}
