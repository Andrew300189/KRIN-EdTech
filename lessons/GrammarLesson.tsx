import React from "react";

export interface GrammarLessonProps {
  title: string;
  example: string;
}

export default function GrammarLesson({ title, example }: GrammarLessonProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
      <div className="mt-4 rounded-lg bg-gray-50 p-4 text-gray-700">
        {example}
      </div>
    </section>
  );
}
