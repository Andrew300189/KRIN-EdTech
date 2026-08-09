import Link from "next/link";
import { prisma } from "@/core/server/prisma";

export default async function CmsEntryPage() {
  const [courses, drafts, scheduled, media, slots] = await Promise.all([
    prisma.course.count(),
    prisma.course.count({ where: { contentStatus: "DRAFT" } }),
    prisma.course.count({ where: { contentStatus: "SCHEDULED" } }),
    prisma.cmsMediaAsset.count({ where: { isArchived: false } }),
    prisma.cmsContentSlot.count({ where: { contentStatus: { not: "ARCHIVED" } } }),
  ]);
  const cards = [
    { href: "/cms/courses", label: "Learning content", value: courses, description: `${drafts} course drafts · ${scheduled} scheduled` },
    { href: "/cms/media", label: "Media library", value: media, description: "Images, audio, video and documents" },
    { href: "/cms/slots", label: "Page slots", value: slots, description: "Homepage and dashboard sections" },
    { href: "/cms/audit", label: "Audit history", value: "→", description: "Content actions and change records" },
  ];
  return <section><p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Platform management</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-950">Content CMS</h1><p className="mt-3 max-w-3xl text-slate-600">Manage the live curriculum without editing code. Publication, archive and preview operations are protected on the server and recorded in the audit trail.</p><div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <Link key={card.href} href={card.href} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"><p className="text-sm font-semibold text-blue-700">{card.label}</p><p className="mt-3 text-4xl font-bold text-slate-950">{card.value}</p><p className="mt-3 text-sm text-slate-600">{card.description}</p></Link>)}</div><section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6"><h2 className="text-lg font-bold text-amber-950">Publication safety</h2><p className="mt-2 text-sm leading-6 text-amber-900">New courses and all copied course structures start as drafts. The CMS checks their parent structure before publishing, preserves version snapshots, and archives records instead of deleting them.</p></section></section>;
}
