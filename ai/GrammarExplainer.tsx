import React from 'react';

export interface GrammarExplainerProps {
  title?: string;
}

export default function GrammarExplainer({ title = 'Grammar Explainer' }: GrammarExplainerProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-3 text-gray-600">Ask the AI to explain grammar rules, examples, and mistakes.</p>
    </section>
  );
}
