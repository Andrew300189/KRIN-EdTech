import React from 'react';

export interface DailyStreakProps {
  days: number;
}

export default function DailyStreak({ days }: DailyStreakProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-xl font-semibold text-gray-900">Daily streak</h3>
      <p className="mt-4 text-4xl font-bold text-orange-500">{days} days</p>
      <p className="mt-2 text-sm text-gray-500">Keep going to unlock more badges.</p>
    </section>
  );
}
