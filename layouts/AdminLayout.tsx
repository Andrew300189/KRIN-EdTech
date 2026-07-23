import React from "react";

type AdminLayoutProps = {
  children: React.ReactNode;
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">Admin Panel</h1>
          <span className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700">
            Admin
          </span>
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
