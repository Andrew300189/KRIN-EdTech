import React from 'react';

export interface LeaderboardEntry {
  name: string;
  score: number;
}

export interface LeaderboardProps {
  entries: LeaderboardEntry[];
}

export default function Leaderboard({ entries }: LeaderboardProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-xl font-semibold text-gray-900">Leaderboard</h3>
      <div className="mt-4 space-y-3">
        {entries.map((entry, index) => (
          <div key={entry.name} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
            <div>
              <p className="font-medium text-gray-900">#{index + 1} {entry.name}</p>
            </div>
            <span className="text-sm font-semibold text-blue-600">{entry.score} pts</span>
          </div>
        ))}
      </div>
    </section>
  );
}
