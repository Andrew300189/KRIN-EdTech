import React from "react";

export interface CourseCardProps {
  title: string;
  description: string;
  level?: string;
  duration?: string;
}

export default function CourseCard({
  title,
  description,
  level = "Beginner",
  duration = "4 weeks",
}: CourseCardProps) {
  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
          {level}
        </span>
      </div>
      <p className="mb-4 text-sm text-gray-600">{description}</p>
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>{duration}</span>
        <button className="font-medium text-blue-600">View course</button>
      </div>
    </article>
  );
}
