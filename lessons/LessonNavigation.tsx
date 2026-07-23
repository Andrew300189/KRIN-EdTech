import React from 'react';

export interface LessonNavigationProps {
  currentLesson: string;
  lessons: string[];
}

export default function LessonNavigation({ currentLesson, lessons }: LessonNavigationProps) {
  return (
    <nav className="flex flex-wrap gap-2 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
      {lessons.map((lesson) => (
        <button
          key={lesson}
          className={`rounded-lg px-3 py-2 text-sm ${currentLesson === lesson ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
        >
          {lesson}
        </button>
      ))}
    </nav>
  );
}
