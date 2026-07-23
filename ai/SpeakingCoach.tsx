import React from 'react';

export interface SpeakingCoachProps {
  title?: string;
}

export default function SpeakingCoach({ title = 'Speaking Coach' }: SpeakingCoachProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-3 text-gray-600">Practice speaking with quick prompts and feedback suggestions.</p>
    </section>
  );
}
