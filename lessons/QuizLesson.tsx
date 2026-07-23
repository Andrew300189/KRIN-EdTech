import React from 'react';

export interface QuizLessonProps {
  title: string;
  questions: string[];
}

export default function QuizLesson({ title, questions }: QuizLessonProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
      <div className="mt-4 space-y-3">
        {questions.map((question, index) => (
          <div key={question} className="rounded-lg bg-gray-50 p-3 text-gray-700">
            {index + 1}. {question}
          </div>
        ))}
      </div>
    </section>
  );
}
