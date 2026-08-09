import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/core/server/prisma";

export default async function PublicCoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = await prisma.course.findFirst({
    where: { slug, isPublished: true, isTemplate: false, accessMode: { not: "HIDDEN" }, level: { isPublished: true }, category: { isPublished: true } },
    select: {
      title: true, shortDescription: true, fullDescription: true, coverImage: true, lessonCount: true, estimatedDuration: true, accessPlan: true,
      level: { select: { code: true, title: true } }, category: { select: { title: true } },
      modules: { where: { isPublished: true }, orderBy: { order: "asc" }, select: { id: true, title: true, description: true, lessons: { where: { isPublished: true }, orderBy: { order: "asc" }, select: { id: true, slug: true, title: true, description: true } } } },
    },
  });
  if (!course) notFound();
  const isFree = course.accessPlan === "FREE";
  return <main className="mx-auto max-w-5xl px-4 py-10 md:px-6"><Link href="/courses" className="text-sm font-semibold text-blue-700 hover:underline">← Courses</Link><section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="p-6 md:p-9"><p className="text-sm font-semibold text-blue-700">{course.level.code} · {course.category.title}</p><h1 className="mt-2 text-3xl font-bold text-slate-950">{course.title}</h1><p className="mt-4 max-w-3xl text-slate-700">{course.fullDescription ?? course.shortDescription}</p><dl className="mt-6 flex flex-wrap gap-5 text-sm text-slate-600"><div><dt className="font-semibold text-slate-900">Lessons</dt><dd>{course.lessonCount}</dd></div><div><dt className="font-semibold text-slate-900">Estimated duration</dt><dd>{course.estimatedDuration ? `${course.estimatedDuration} min` : "Self-paced"}</dd></div><div><dt className="font-semibold text-slate-900">Access</dt><dd>{isFree ? "Free" : "Premium"}</dd></div></dl><Link href={isFree ? "/register" : "/pricing"} className="mt-7 inline-flex rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800">{isFree ? "Start learning" : "View access"}</Link></div></section><section className="mt-8"><h2 className="text-2xl font-bold text-slate-950">Course outline</h2>{course.modules.length === 0 ? <p className="mt-3 text-slate-600">The lesson plan is being prepared.</p> : <div className="mt-4 space-y-3">{course.modules.map((module) => <article key={module.id} className="rounded-xl border border-slate-200 bg-white p-5"><h3 className="font-bold text-slate-950">{module.title}</h3>{module.description ? <p className="mt-1 text-sm text-slate-600">{module.description}</p> : null}{isFree ? <ul className="mt-3 space-y-2">{module.lessons.map((lesson) => <li key={lesson.id} id={`lesson-${lesson.slug}`} className="scroll-mt-6 rounded-lg bg-slate-50 px-3 py-2"><p className="font-medium text-slate-900">{lesson.title}</p>{lesson.description ? <p className="mt-1 text-sm text-slate-600">{lesson.description}</p> : null}</li>)}</ul> : <p className="mt-3 text-sm text-slate-600">Lesson titles are available after access is granted.</p>}</article>)}</div>}</section></main>;
}
