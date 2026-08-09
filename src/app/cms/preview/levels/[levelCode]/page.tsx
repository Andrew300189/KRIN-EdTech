/* eslint-disable @next/next/no-img-element -- preview renders owner-managed external HTTP(S) cover URLs. */
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/core/server/prisma";

export default async function CmsLevelPreviewPage({ params }: { params: Promise<{ levelCode: string }> }) {
  const { levelCode } = await params;
  const level = await prisma.languageLevel.findUnique({
    where: { code: levelCode.toUpperCase() as "A1" | "A2" | "B1" | "B2" | "C1" | "C2" },
    include: {
      curriculumNodes: { where: { contentStatus: "PUBLISHED" }, orderBy: [{ type: "asc" }, { order: "asc" }], select: { id: true, type: true, title: true, description: true } },
      courses: {
        where: { contentStatus: "PUBLISHED", category: { contentStatus: "PUBLISHED" } },
        orderBy: { order: "asc" },
        include: { category: { select: { title: true } }, _count: { select: { modules: true } } },
      },
    },
  });
  if (!level) notFound();

  const sections = level.curriculumNodes.filter((node) => node.type === "SECTION");
  return <main className="min-h-screen bg-slate-50 py-10">
    <div className="mx-auto max-w-6xl px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><p className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-900">CMS learner preview</p><Link href="/cms/levels" className="text-sm font-semibold text-blue-700 hover:underline">← Back to levels</Link></div>
      <header className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-xl">
        <div className="relative min-h-64 p-8 sm:p-12">
          {level.coverImage ? <img src={level.coverImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" /> : null}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-blue-900/60" />
          <div className="relative max-w-2xl"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-200">English level {level.code}</p><h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">{level.title}</h1><p className="mt-4 text-lg leading-8 text-slate-200">{level.description}</p></div>
        </div>
      </header>

      <section className="mt-10"><div className="flex items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Curriculum</p><h2 className="mt-1 text-3xl font-bold text-slate-950">What you will study</h2></div><p className="text-sm text-slate-500">{sections.length} published sections</p></div>{sections.length === 0 ? <p className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-slate-600">Published sections are being prepared.</p> : <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{sections.map((section) => <article key={section.id} className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-bold text-slate-950">{section.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{section.description ?? "Explore this part of the level."}</p></article>)}</div>}</section>

      <section className="mt-10"><div className="flex items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Courses</p><h2 className="mt-1 text-3xl font-bold text-slate-950">Available courses</h2></div><p className="text-sm text-slate-500">{level.courses.length} published</p></div>{level.courses.length === 0 ? <p className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-slate-600">Published courses for this level are being prepared.</p> : <div className="mt-5 grid gap-4 md:grid-cols-2">{level.courses.map((course) => <article key={course.id} className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-bold uppercase tracking-wide text-blue-700">{course.category.title} · {course._count.modules} modules</p><h3 className="mt-2 text-xl font-bold text-slate-950">{course.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{course.shortDescription}</p></article>)}</div>}</section>
    </div>
  </main>;
}
