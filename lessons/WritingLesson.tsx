import React from "react";

export interface WritingLessonProps {
  title: string;
  prompt: string;
}

export default function WritingLesson({ title, prompt }: WritingLessonProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
      <p className="mt-3 text-gray-600">{prompt}</p>
      <textarea
        className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2"
        rows={8}
        placeholder="Write your response here..."
      />
    </section>
  );
}
