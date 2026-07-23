import React from 'react';

export interface ReviewCardProps {
  title: string;
  count: number;
  hint?: string;
}

export default function ReviewCard({ title, count, hint }: ReviewCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-3xl font-bold text-blue-600">{count}</p>
      {hint && <p className="mt-2 text-sm text-gray-500">{hint}</p>}
    </div>
  );
}
