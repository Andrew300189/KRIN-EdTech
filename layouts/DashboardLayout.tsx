import React from "react";

type DashboardLayoutProps = {
  children: React.ReactNode;
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-64 border-r border-gray-200 bg-white p-4">
        <h2 className="mb-4 text-lg font-semibold">Dashboard</h2>
        <nav className="space-y-2 text-sm text-gray-600">
          <a href="#" className="block rounded-md px-3 py-2 hover:bg-gray-100">
            Overview
          </a>
          <a href="#" className="block rounded-md px-3 py-2 hover:bg-gray-100">
            Courses
          </a>
          <a href="#" className="block rounded-md px-3 py-2 hover:bg-gray-100">
            Progress
          </a>
          <a href="#" className="block rounded-md px-3 py-2 hover:bg-gray-100">
            Settings
          </a>
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
