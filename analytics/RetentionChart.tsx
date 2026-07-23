import React from 'react';

export interface RetentionChartProps {
  data: number[];
}

export default function RetentionChart({ data }: RetentionChartProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-xl font-semibold text-gray-900">Retention</h3>
      <div className="mt-4 flex h-40 items-end gap-2">
        {data.map((value, index) => (
          <div key={index} className="flex-1 rounded-t-lg bg-purple-500" style={{ height: `${value}%` }} />
        ))}
      </div>
    </section>
  );
}
