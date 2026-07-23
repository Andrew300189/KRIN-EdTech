import React from 'react';

export interface ListeningLessonProps {
  title: string;
  audioUrl?: string;
}

export default function ListeningLesson({ title, audioUrl }: ListeningLessonProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
      <div className="mt-4 rounded-lg border border-dashed border-gray-300 p-4 text-gray-600">
        {audioUrl ? <audio controls className="w-full" src={audioUrl} /> : 'Audio content will appear here.'}
      </div>
    </section>
  );
}
