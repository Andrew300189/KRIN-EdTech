import React from 'react';

export interface ProgressChartProps {
  value: number;
}

export default function ProgressChart({ value }: ProgressChartProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-xl font-semibold text-gray-900">Completion progress</h3>
      <div className="mt-4 h-3 rounded-full bg-gray-200">
        <div className="h-3 rounded-full bg-green-500" style={{ width: `${value}%` }} />
      </div>
      <p className="mt-2 text-sm text-gray-600">{value}% completed</p>
    </section>
  );
}
