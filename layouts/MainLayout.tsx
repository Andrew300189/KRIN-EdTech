import React from "react";

type MainLayoutProps = {
  children: React.ReactNode;
};

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <h1 className="text-lg font-semibold">KRIN EdTech</h1>
          <nav className="flex gap-4 text-sm text-gray-600">
            <a href="#" className="hover:text-blue-600">
              Home
            </a>
            <a href="#" className="hover:text-blue-600">
              Courses
            </a>
            <a href="#" className="hover:text-blue-600">
              About
            </a>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
