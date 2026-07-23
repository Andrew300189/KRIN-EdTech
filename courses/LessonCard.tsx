import React from 'react';

export interface LessonCardProps {
  title: string;
  duration?: string;
  completed?: boolean;
}

export default function LessonCard({ title, duration = '10 min', completed = false }: LessonCardProps) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
      <div>
        <h4 className="font-medium text-gray-900">{title}</h4>
        <p className="text-sm text-gray-500">{duration}</p>
      </div>
      <span className={`rounded-full px-3 py-1 text-xs font-medium ${completed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
        {completed ? 'Completed' : 'Upcoming'}
      </span>
    </div>
  );
}
