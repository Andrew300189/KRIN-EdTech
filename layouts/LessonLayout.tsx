import React from "react";

type LessonLayoutProps = {
  children: React.ReactNode;
};

export default function LessonLayout({ children }: LessonLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Lesson Workspace
        </h2>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
