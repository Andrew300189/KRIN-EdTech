import React from 'react';
import WordCard from './WordCard';

export interface LearnedWordsProps {
  words: Array<{ word: string; translation: string; category?: string }>;
}

export default function LearnedWords({ words }: LearnedWordsProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-xl font-semibold text-gray-900">Learned words</h3>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {words.map((item) => (
          <WordCard key={item.word} {...item} />
        ))}
      </div>
    </section>
  );
}
