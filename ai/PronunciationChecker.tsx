import React from "react";

export interface PronunciationCheckerProps {
  title?: string;
}

export default function PronunciationChecker({
  title = "Pronunciation Checker",
}: PronunciationCheckerProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-3 text-gray-600">
        Upload or type a sentence to get pronunciation guidance.
      </p>
    </section>
  );
}
