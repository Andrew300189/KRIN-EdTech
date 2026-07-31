"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { VocabularyReviewPrompt } from "@/modules/vocabulary/components/VocabularyReviewPrompt";
import { NotificationBell } from "@/modules/communications/components/NotificationBell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const handleSignOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-sm">
        <div className="p-6">
          <Link
            href="/"
            className="text-xl font-bold text-primary hover:opacity-90"
          >
            KRIN EdTech
          </Link>
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
            href="/profile/achievements"
            className="block px-4 py-2 rounded hover:bg-gray-100"
          >
            Achievements
          </Link>
          <Link
            href="/profile/analytics"
            className="block px-4 py-2 rounded hover:bg-gray-100"
          >
            Analytics
          </Link>
          <Link
            href="/profile/rewards"
            className="block px-4 py-2 rounded hover:bg-gray-100"
          >
            Rewards
          </Link>
          <Link
            href="/dashboard/profile"
            id="tour-nav-profile"
            className="block px-4 py-2 rounded hover:bg-gray-100"
          >
            Profile
          </Link>
          <Link href="/profile/notifications" className="block px-4 py-2 rounded hover:bg-gray-100">Notifications</Link>
          <Link href="/profile/support" className="block px-4 py-2 rounded hover:bg-gray-100">Support</Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className="bg-white shadow-sm border-b">
          <div className="px-6 py-4 flex justify-between items-center">
            <h1 className="text-lg font-semibold">Dashboard</h1>
            <div className="flex items-center gap-3">
              <NotificationBell />
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
      <VocabularyReviewPrompt />
    </div>
  );
}
