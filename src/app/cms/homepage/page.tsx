import Link from "next/link";
import { prisma } from "@/core/server/prisma";
import { CmsLifecycleControls } from "@/modules/cms/components/CmsLifecycleControls";
import { CmsEmptyState, CmsPageShell } from "@/modules/cms/components/CmsPageShell";

export default async function CmsHomepagePage() {
  const slots = await prisma.cmsContentSlot.findMany({ where: { area: "HOME" }, orderBy: { key: "asc" } });
  return <CmsPageShell eyebrow="Presentation" title="Homepage content" description="Homepage copy is managed through safe structured CMS slots. Course collections will be connected here after the curriculum placement model is introduced." actions={<Link href="/cms/slots" className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">Manage slots</Link>}>{slots.length === 0 ? <CmsEmptyState description="No homepage slots have been created. Create a home.hero draft to add managed content above the existing landing page." action={<Link href="/cms/slots" className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white">Create a slot</Link>} /> : <div className="space-y-4">{slots.map((slot) => <article key={slot.id} className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5"><div><p className="font-mono text-xs text-blue-700">{slot.key}</p><h2 className="mt-1 text-lg font-bold text-slate-950">{slot.title}</h2><p className="mt-2 text-sm text-slate-600">Structured content is rendered without arbitrary HTML or script execution.</p></div><CmsLifecycleControls entityType="CONTENT_SLOT" entityId={slot.id} status={slot.contentStatus} compact /></article>)}</div>}</CmsPageShell>;
}
