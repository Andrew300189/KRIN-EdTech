import React from 'react';

export interface AchievementCardProps {
  title: string;
  description: string;
  unlocked?: boolean;
}

export default function AchievementCard({ title, description, unlocked = false }: AchievementCardProps) {
  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${unlocked ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'}`}>
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm text-gray-600">{description}</p>
      <p className={`mt-4 text-sm font-medium ${unlocked ? 'text-green-700' : 'text-gray-500'}`}>
        {unlocked ? 'Unlocked' : 'Locked'}
      </p>
    </div>
  );
}
