import Link from "next/link";
import { prisma } from "@/core/server/prisma";
import { CmsEmptyState, CmsPageShell } from "@/modules/cms/components/CmsPageShell";
import { CmsLifecycleControls } from "@/modules/cms/components/CmsLifecycleControls";

const requiredSlots = [
  ["legal.organization", "Organisation and contact details"],
  ["legal.terms", "Terms of use"],
  ["legal.privacy", "Privacy policy"],
  ["legal.payments", "Payment rules"],
  ["legal.refunds", "Refund policy"],
] as const;

export default async function CmsLegalPage() {
  const slots = await prisma.cmsContentSlot.findMany({ where: { area: "LEGAL" }, orderBy: { key: "asc" } });
  const slotKeys = new Set(slots.map((slot) => slot.key));

  return <CmsPageShell
    eyebrow="Platform trust"
    title="Legal and trust information"
    description="Publish only verified organisation, contact, payment and policy information. This CMS never invents legal text or claims a policy exists before you provide and publish it."
    actions={<Link href="/cms/slots" className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">Manage legal slots</Link>}
  >
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950"><h2 className="font-bold">Before accepting paid access</h2><p className="mt-2">Add verified organisation and support contacts, terms, privacy policy, payment rules and refund policy. Review them with an appropriate legal adviser for the relevant jurisdiction before publication.</p></section>
    <section className="grid gap-3 md:grid-cols-2"><h2 className="md:col-span-2 text-lg font-bold text-slate-950">Publication checklist</h2>{requiredSlots.map(([key, title]) => <article key={key} className="rounded-xl border border-slate-200 bg-white p-4"><p className="font-semibold text-slate-950">{title}</p><p className="mt-1 font-mono text-xs text-slate-500">{key}</p><p className={`mt-3 text-sm ${slotKeys.has(key) ? "text-emerald-700" : "text-amber-700"}`}>{slotKeys.has(key) ? "Slot exists — check its publication status below." : "Not created yet."}</p></article>)}</section>
    {slots.length ? <section className="space-y-3"><h2 className="text-lg font-bold text-slate-950">Legal slots</h2>{slots.map((slot) => <article key={slot.id} className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5"><div><p className="font-mono text-xs text-blue-700">{slot.key}</p><h2 className="mt-1 text-lg font-bold text-slate-950">{slot.title}</h2><p className="mt-2 text-sm text-slate-600">Public route: {slot.key.replace(/^legal\./, "/legal/")}</p></div><CmsLifecycleControls entityType="CONTENT_SLOT" entityId={slot.id} status={slot.contentStatus} compact /></article>)}</section> : <CmsEmptyState title="Legal information is not published" description="Create the required slots as drafts, add verified information, and publish each document when it is ready." action={<Link href="/cms/slots" className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white">Create legal slots</Link>} />}
  </CmsPageShell>;
}
