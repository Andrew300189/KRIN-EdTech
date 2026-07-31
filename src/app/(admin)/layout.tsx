import Link from "next/link";
import { redirect } from "next/navigation";
import { hasAnyRole, parseRole } from "@/core/utils/role";
import { requireAuth } from "@/core/server/session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authenticated = await requireAuth();
  if (!authenticated) {
    redirect("/login");
  }

  const role = parseRole(authenticated.user.role);

  if (!hasAnyRole(role, ["content_manager"])) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <aside className="w-64 bg-white shadow-sm">
          <div className="p-6">
            <Link
              href="/admin"
              className="text-xl font-bold text-primary hover:opacity-90"
            >
              Admin Panel
            </Link>
          </div>
          <nav className="px-4 py-6 space-y-2">
            <Link
              href="/admin"
              className="block px-4 py-2 rounded hover:bg-gray-100"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/users"
              className="block px-4 py-2 rounded hover:bg-gray-100"
            >
              Users
            </Link>
            <Link
              href="/admin/levels"
              className="block px-4 py-2 rounded hover:bg-gray-100"
            >
              Levels
            </Link>
            <Link
              href="/admin/courses"
              className="block px-4 py-2 rounded hover:bg-gray-100"
            >
              Courses
            </Link>
            <Link
              href="/admin/categories"
              className="block px-4 py-2 rounded hover:bg-gray-100"
            >
              Categories
            </Link>
            <Link
              href="/admin/vocabulary"
              className="block px-4 py-2 rounded hover:bg-gray-100"
            >
              Vocabulary
            </Link>
            <Link
              href="/admin/grammar"
              className="block px-4 py-2 rounded hover:bg-gray-100"
            >
              Grammar
            </Link>
            <Link
              href="/admin/rewards"
              className="block px-4 py-2 rounded hover:bg-gray-100"
            >
              Rewards
            </Link>
            <Link
              href="/admin/achievements"
              className="block px-4 py-2 rounded hover:bg-gray-100"
            >
              Achievements
            </Link>
            <Link
              href="/admin/analytics"
              className="block px-4 py-2 rounded hover:bg-gray-100"
            >
              Analytics
            </Link>
            <Link href="/admin/billing/orders" className="block px-4 py-2 rounded hover:bg-gray-100">Orders</Link>
            <Link href="/admin/billing/products" className="block px-4 py-2 rounded hover:bg-gray-100">Products</Link>
            <Link href="/admin/billing/plans" className="block px-4 py-2 rounded hover:bg-gray-100">Plans</Link>
            <Link href="/admin/support/tickets" className="block px-4 py-2 rounded hover:bg-gray-100">Support</Link>
            <Link href="/admin/communications/announcements" className="block px-4 py-2 rounded hover:bg-gray-100">Announcements</Link>
          </nav>
        </aside>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
