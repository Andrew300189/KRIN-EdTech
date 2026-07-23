import React from 'react';

export interface EssayCheckerProps {
  title?: string;
}

export default function EssayChecker({ title = 'Essay Checker' }: EssayCheckerProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <textarea className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2" rows={6} placeholder="Paste your essay here..." />
      <button className="mt-4 rounded-lg bg-purple-600 px-4 py-2 text-white">Check essay</button>
    </section>
  );
}
