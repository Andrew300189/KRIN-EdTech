import { prisma } from "@/core/server/prisma";

export default async function CmsAuditPage() {
  const entries = await prisma.contentAuditLog.findMany({
    where: { action: { startsWith: "CMS_" } },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { actor: { select: { name: true, email: true } } },
  });
  return <section><p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Audit history</p><h1 className="mt-1 text-3xl font-bold text-slate-950">CMS activity</h1><p className="mt-2 text-slate-600">The last 200 owner actions are retained here. Version snapshots are stored separately per content item for safe restore workflows.</p><div className="mt-7 overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="px-4 py-3">Time</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Content</th><th className="px-4 py-3">Actor</th></tr></thead><tbody>{entries.map((entry) => <tr key={entry.id} className="border-t border-slate-100"><td className="whitespace-nowrap px-4 py-3 text-slate-600">{entry.createdAt.toLocaleString()}</td><td className="px-4 py-3 font-semibold text-slate-900">{entry.action.replace(/^CMS_/, "").replace(/_/g, " ")}</td><td className="px-4 py-3 text-slate-700">{entry.entityType} <span className="font-mono text-xs text-slate-400">{entry.entityId}</span></td><td className="px-4 py-3 text-slate-600">{entry.actor.name || entry.actor.email}</td></tr>)}{entries.length === 0 ? <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-500">No CMS actions have been recorded yet.</td></tr> : null}</tbody></table></div></section>;
}
