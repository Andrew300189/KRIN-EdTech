"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const handleSignOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/auth/login");
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-sm">
        <div className="p-6">
          <h2 className="text-xl font-bold text-primary">KRIN EdTech</h2>
        </div>

        <nav className="px-4 py-6 space-y-2">
          <Link
            href="/dashboard"
            className="block px-4 py-2 rounded hover:bg-gray-100"
          >
            Dashboard
          </Link>
          <Link
            href="/dashboard/courses"
            id="tour-nav-courses"
            className="block px-4 py-2 rounded hover:bg-gray-100"
          >
            My Courses
          </Link>
          <Link
            href="/dashboard/teacher/courses"
            className="block px-4 py-2 rounded hover:bg-gray-100"
          >
            Teacher Courses
          </Link>
          <Link
            href="/dashboard/lessons"
            id="tour-nav-lessons"
            className="block px-4 py-2 rounded hover:bg-gray-100"
          >
            Lessons
          </Link>
          <Link
            href="/dashboard/vocabulary"
            id="tour-nav-vocabulary"
            className="block px-4 py-2 rounded hover:bg-gray-100"
          >
            Vocabulary
          </Link>
          <Link
            href="/dashboard/ai-tutor"
            className="block px-4 py-2 rounded hover:bg-gray-100"
          >
            AI Tutor
          </Link>
          <Link
            href="/dashboard/achievements"
            className="block px-4 py-2 rounded hover:bg-gray-100"
          >
            Achievements
          </Link>
          <Link
            href="/dashboard/profile"
            id="tour-nav-profile"
            className="block px-4 py-2 rounded hover:bg-gray-100"
          >
            Profile
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className="bg-white shadow-sm border-b">
          <div className="px-6 py-4 flex justify-between items-center">
            <h1 className="text-lg font-semibold">Dashboard</h1>
            <div>
              <button
                className="text-sm text-gray-600 hover:text-gray-900"
                onClick={handleSignOut}
              >
                Sign Out
              </button>
            </div>
          </div>
        </header>

        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
