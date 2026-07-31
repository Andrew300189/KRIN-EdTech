"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { VocabularyReviewPrompt } from "@/modules/vocabulary/components/VocabularyReviewPrompt";
import { NotificationBell } from "@/modules/communications/components/NotificationBell";

const navigation = [
  { href: "/dashboard", label: "Dashboard", exact: true },
  { href: "/dashboard/courses", label: "My Courses" },
  { href: "/dashboard/academies", label: "Academies" },
  { href: "/dashboard/lessons", label: "Lessons" },
  { href: "/dashboard/vocabulary", label: "Vocabulary" },
  { href: "/dashboard/progress", label: "Progress" },
  { href: "/dashboard/mistakes", label: "Mistakes" },
  { href: "/dashboard/achievements", label: "Achievements" },
  { href: "/dashboard/analytics", label: "Analytics" },
  { href: "/dashboard/ai-tutor", label: "AI Tutor" },
  { href: "/dashboard/billing", label: "Billing" },
  { href: "/dashboard/settings", label: "Settings" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const handleSignOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/");
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-64 shrink-0 overflow-y-auto bg-white shadow-sm">
        <div className="p-6">
          <Link href="/" className="text-xl font-bold text-primary hover:opacity-90">
            KRIN EdTech
          </Link>
        </div>

        <nav aria-label="Dashboard navigation" className="space-y-1 px-4 py-4">
          {navigation.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                aria-current={active ? "page" : undefined}
                className={`block rounded px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${active ? "bg-primary/10 text-primary" : "text-slate-700 hover:bg-gray-100"}`}
                href={item.href}
              >
                {item.label}
              </Link>
            );
          })}
          <div className="my-3 border-t border-slate-200" />
          <Link className="block rounded px-4 py-2 text-sm font-medium text-slate-700 hover:bg-gray-100" href="/profile/notifications">Notifications</Link>
          <Link className="block rounded px-4 py-2 text-sm font-medium text-slate-700 hover:bg-gray-100" href="/profile/support">Support</Link>
        </nav>
      </aside>

      <main className="min-w-0 flex-1 overflow-auto">
        <header className="border-b bg-white shadow-sm">
          <div className="flex items-center justify-between px-6 py-4">
            <h1 className="text-lg font-semibold">Dashboard</h1>
            <div className="flex items-center gap-3">
              <NotificationBell />
              <button className="text-sm text-gray-600 hover:text-gray-900" onClick={handleSignOut} type="button">Sign Out</button>
            </div>
          </div>
        </header>
        <div className="p-6">{children}</div>
      </main>
      <VocabularyReviewPrompt />
    </div>
  );
}
