import React from 'react';

export interface ReadingLessonProps {
  title: string;
  content: string;
}

export default function ReadingLesson({ title, content }: ReadingLessonProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
      <p className="mt-3 whitespace-pre-line text-gray-600">{content}</p>
    </section>
  );
}
