import React, { useState } from 'react';

export interface FlashCardProps {
  word: string;
  translation: string;
  example?: string;
}

export default function FlashCard({ word, translation, example }: FlashCardProps) {
  const [flipped, setFlipped] = useState(false);

  return (
    <button
      onClick={() => setFlipped((prev) => !prev)}
      className="h-48 w-full rounded-2xl border border-gray-200 bg-white p-6 text-left shadow-sm transition hover:shadow-md"
    >
      <div className="flex h-full flex-col justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-blue-600">Flashcard</p>
          <h3 className="mt-2 text-xl font-semibold text-gray-900">{flipped ? translation : word}</h3>
          {example && <p className="mt-3 text-sm text-gray-600">{flipped ? `Example: ${example}` : 'Tap to reveal translation'}</p>}
        </div>
        <p className="text-xs text-gray-400">{flipped ? 'Tap to see the word' : 'Tap to see the meaning'}</p>
      </div>
    </button>
  );
}
