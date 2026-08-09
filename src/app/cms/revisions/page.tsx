import Link from "next/link";
import { prisma } from "@/core/server/prisma";
import { CmsEmptyState, CmsPageShell } from "@/modules/cms/components/CmsPageShell";

export default async function CmsRevisionsPage({ searchParams }: { searchParams: Promise<{ entityType?: string; entityId?: string }> }) {
  const filters = await searchParams;
  const revisions = await prisma.cmsContentVersion.findMany({
    where: { ...(filters.entityType ? { entityType: filters.entityType as never } : {}), ...(filters.entityId ? { entityId: filters.entityId } : {}) },
    take: 200,
    orderBy: { createdAt: "desc" },
    include: { actor: { select: { name: true, email: true } } },
  });
  const filtered = Boolean(filters.entityType || filters.entityId);
  return <CmsPageShell eyebrow="Content safety" title="Revisions" description="Immutable snapshots are recorded for content changes, lifecycle transitions, moves, copies and localizations."><div className="flex flex-wrap gap-3"><Link href="/cms/revisions" className="rounded border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-white">All revisions</Link>{filtered ? <span className="rounded bg-blue-50 px-3 py-2 text-sm text-blue-800">Filtered history</span> : null}</div>{revisions.length === 0 ? <CmsEmptyState description={filtered ? "No revisions match this content item." : "No CMS revision snapshots have been recorded yet."} /> : <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="px-4 py-3">Time</th><th className="px-4 py-3">Content</th><th className="px-4 py-3">Version</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Owner</th></tr></thead><tbody>{revisions.map((revision) => <tr key={revision.id} className="border-t border-slate-100"><td className="whitespace-nowrap px-4 py-3 text-slate-600">{revision.createdAt.toLocaleString()}</td><td className="px-4 py-3 font-mono text-xs text-slate-700">{revision.entityType} · {revision.entityId}</td><td className="px-4 py-3">{revision.version}</td><td className="px-4 py-3">{revision.action}</td><td className="px-4 py-3 text-slate-600">{revision.actor?.name || revision.actor?.email || "System"}</td></tr>)}</tbody></table></div>}</CmsPageShell>;
}
