import React from 'react';

export interface HomeworkLessonProps {
  title: string;
  instructions: string;
}

export default function HomeworkLesson({ title, instructions }: HomeworkLessonProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
      <p className="mt-3 text-gray-600">{instructions}</p>
      <button className="mt-4 rounded-lg bg-green-600 px-4 py-2 text-white">Submit homework</button>
    </section>
  );
}
