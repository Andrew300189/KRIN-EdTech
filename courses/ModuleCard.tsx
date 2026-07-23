import React from 'react';

export interface ModuleCardProps {
  title: string;
  description: string;
  lessons?: number;
}

export default function ModuleCard({ title, description, lessons = 4 }: ModuleCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <h4 className="font-semibold text-gray-900">{title}</h4>
      <p className="mt-2 text-sm text-gray-600">{description}</p>
      <p className="mt-3 text-sm text-blue-600">{lessons} lessons</p>
    </div>
  );
}
