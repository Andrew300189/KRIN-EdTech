import React from 'react';

export interface WordCardProps {
  word: string;
  translation: string;
  category?: string;
}

export default function WordCard({ word, translation, category = 'General' }: WordCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">{word}</h3>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">{category}</span>
      </div>
      <p className="mt-2 text-sm text-gray-600">{translation}</p>
    </div>
  );
}
