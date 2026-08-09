import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/core/server/prisma";

export default async function CmsCurriculumPreviewPage({ params }: { params: Promise<{ nodeId: string }> }) {
  const node = await prisma.curriculumNode.findUnique({
    where: { id: (await params).nodeId },
    include: {
      level: { select: { code: true, title: true } },
      parent: { select: { title: true, type: true } },
      children: { where: { contentStatus: "PUBLISHED" }, orderBy: { order: "asc" }, select: { id: true, type: true, title: true, description: true } },
      courseLinks: { include: { course: { select: { id: true, title: true, shortDescription: true, contentStatus: true } } }, orderBy: { relation: "asc" } },
      translations: { orderBy: { locale: "asc" } },
    },
  });
  if (!node) notFound();
  return <main className="mx-auto max-w-5xl px-6 py-10"><div className="flex flex-wrap items-center justify-between gap-4"><Link href={`/cms/${node.type === "SECTION" ? "sections" : node.type === "TOPIC" ? "topics" : "subtopics"}`} className="text-sm font-semibold text-blue-700 hover:underline">← Back to CMS</Link><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase text-amber-900">CMS learner preview</span></div><header className="mt-8 rounded-3xl bg-slate-950 p-8 text-white"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-200">{node.level.code} · {node.type}{node.parent ? ` · ${node.parent.title}` : ""}</p><h1 className="mt-3 text-4xl font-bold">{node.title}</h1><p className="mt-4 max-w-3xl text-lg leading-8 text-slate-200">{node.description ?? "Content description is being prepared."}</p></header><section className="mt-8 grid gap-5 md:grid-cols-2"><article className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-xl font-bold text-slate-950">Included content</h2><p className="mt-2 text-sm text-slate-600">{node.children.length} published child items</p><div className="mt-4 space-y-3">{node.children.map((child) => <div key={child.id} className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-bold text-blue-700">{child.type}</p><h3 className="mt-1 font-bold text-slate-900">{child.title}</h3><p className="mt-1 text-sm text-slate-600">{child.description ?? ""}</p></div>)}{node.children.length === 0 ? <p className="text-sm text-slate-500">No published child content.</p> : null}</div></article><article className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-xl font-bold text-slate-950">Courses</h2><div className="mt-4 space-y-3">{node.courseLinks.map((link) => <div key={link.id} className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-bold text-blue-700">{link.relation}</p><h3 className="mt-1 font-bold text-slate-900">{link.course.title}</h3><p className="mt-1 text-sm text-slate-600">{link.course.shortDescription}</p></div>)}{node.courseLinks.length === 0 ? <p className="text-sm text-slate-500">No courses are linked yet.</p> : null}</div></article></section><section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-xl font-bold text-slate-950">Localized variants</h2><div className="mt-4 flex flex-wrap gap-2"><span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold">{node.locale} (base)</span>{node.translations.map((translation) => <span key={translation.id} className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-800">{translation.locale}: {translation.title}</span>)}</div></section></main>;
}
