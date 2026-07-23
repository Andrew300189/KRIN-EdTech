import React from "react";

export interface VocabularyLessonProps {
  title: string;
  words: string[];
}

export default function VocabularyLesson({
  title,
  words,
}: VocabularyLessonProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
      <div className="mt-4 flex flex-wrap gap-2">
        {words.map((word) => (
          <span
            key={word}
            className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700"
          >
            {word}
          </span>
        ))}
      </div>
    </section>
  );
}
