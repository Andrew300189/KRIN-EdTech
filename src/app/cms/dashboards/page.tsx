import Link from "next/link";
import { prisma } from "@/core/server/prisma";
import { CmsLifecycleControls } from "@/modules/cms/components/CmsLifecycleControls";
import { CmsEmptyState, CmsPageShell } from "@/modules/cms/components/CmsPageShell";

export default async function CmsDashboardsPage() {
  const slots = await prisma.cmsContentSlot.findMany({ where: { area: { in: ["STUDENT_DASHBOARD", "TEACHER_DASHBOARD"] } }, orderBy: [{ area: "asc" }, { key: "asc" }] });
  return <CmsPageShell eyebrow="Presentation" title="Dashboard content" description="Manage safe, published banner content for student and teacher dashboards." actions={<Link href="/cms/slots" className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">Manage slots</Link>}>{slots.length === 0 ? <CmsEmptyState description="No dashboard slots have been created yet." action={<Link href="/cms/slots" className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white">Create a slot</Link>} /> : <div className="grid gap-4 md:grid-cols-2">{slots.map((slot) => <article key={slot.id} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-blue-700">{slot.area}</p><h2 className="mt-1 text-lg font-bold text-slate-950">{slot.title}</h2><p className="mt-1 font-mono text-xs text-slate-500">{slot.key}</p></div><CmsLifecycleControls entityType="CONTENT_SLOT" entityId={slot.id} status={slot.contentStatus} compact /></div></article>)}</div>}</CmsPageShell>;
}
