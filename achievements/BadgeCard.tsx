import React from 'react';

export interface BadgeCardProps {
  name: string;
  level: string;
}

export default function BadgeCard({ name, level }: BadgeCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="font-semibold text-gray-900">{name}</h3>
      <p className="mt-2 text-sm text-gray-500">{level}</p>
    </div>
  );
}
