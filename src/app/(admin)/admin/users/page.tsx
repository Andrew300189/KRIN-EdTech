import { prisma } from "@/core/server/prisma";

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, name: true, email: true, role: true, isBlocked: true, createdAt: true },
  });
  return <div className="space-y-6"><header><h1 className="text-3xl font-bold">Users</h1><p className="mt-2 text-gray-600">The first 100 most recently registered users.</p></header><div className="overflow-hidden rounded-xl bg-white shadow-sm"><table className="w-full text-left"><thead className="bg-gray-50"><tr><th className="px-6 py-3 text-xs font-medium text-gray-500">Name</th><th className="px-6 py-3 text-xs font-medium text-gray-500">Email</th><th className="px-6 py-3 text-xs font-medium text-gray-500">Role</th><th className="px-6 py-3 text-xs font-medium text-gray-500">Status</th></tr></thead><tbody className="divide-y">{users.map((user) => <tr key={user.id}><td className="px-6 py-3">{user.name}</td><td className="px-6 py-3">{user.email}</td><td className="px-6 py-3">{user.role}</td><td className="px-6 py-3">{user.isBlocked ? "Blocked" : "Active"}</td></tr>)}{users.length === 0 ? <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">No users yet.</td></tr> : null}</tbody></table></div></div>;
}
