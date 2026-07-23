import React from "react";

export interface CourseDetailsProps {
  title: string;
  description: string;
  objectives?: string[];
}

export default function CourseDetails({
  title,
  description,
  objectives = [],
}: CourseDetailsProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
      <h2 className="text-2xl font-semibold text-gray-900">{title}</h2>
      <p className="mt-3 text-gray-600">{description}</p>
      {objectives.length > 0 && (
        <div className="mt-6">
          <h3 className="font-medium text-gray-900">What you'll learn</h3>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-600">
            {objectives.map((objective) => (
              <li key={objective}>{objective}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
