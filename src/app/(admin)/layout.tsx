import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { parseRole } from "@/core/utils/role";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const role = parseRole((await headers()).get("x-user-role"));

  if (role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <aside className="w-64 bg-white shadow-sm">
          <div className="p-6">
            <h2 className="text-xl font-bold text-primary">Admin Panel</h2>
          </div>
          <nav className="px-4 py-6 space-y-2">
            <a
              href="/admin"
              className="block px-4 py-2 rounded hover:bg-gray-100"
            >
              Dashboard
            </a>
            <a
              href="/admin/users"
              className="block px-4 py-2 rounded hover:bg-gray-100"
            >
              Users
            </a>
            <a
              href="/admin/courses"
              className="block px-4 py-2 rounded hover:bg-gray-100"
            >
              Courses
            </a>
            <a
              href="/admin/analytics"
              className="block px-4 py-2 rounded hover:bg-gray-100"
            >
              Analytics
            </a>
          </nav>
        </aside>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
