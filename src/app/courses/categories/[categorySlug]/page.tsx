import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedCourseCategoryBySlug } from "@/modules/courses/services/content.service";
import { getPublicCourseHref } from "@/modules/courses/utils/public-content-routes";

export default async function CategoryCoursesPage({ params }: { params: Promise<{ categorySlug: string }> }) {
  const { categorySlug } = await params;
  const category = await getPublishedCourseCategoryBySlug(categorySlug);
  if (!category) notFound();

  return <main className="mx-auto max-w-6xl px-6 py-12">
    <Link href="/courses" className="text-sm font-semibold text-blue-700 hover:underline">← All courses</Link>
    <header className="mt-5 max-w-3xl"><p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Course direction</p><h1 className="mt-2 text-4xl font-bold text-slate-900">{category.icon ? `${category.icon} ` : ""}{category.title}</h1>{category.description ? <p className="mt-3 text-slate-600">{category.description}</p> : null}</header>
    {category.courses.length === 0 ? <p className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-7 text-slate-600">Published courses in this direction are being prepared.</p> : <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3" aria-label={`${category.title} courses`}>{category.courses.map((course) => <article key={course.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex gap-2 text-xs font-semibold"><span className="rounded-full bg-blue-50 px-3 py-1 text-blue-800">{course.level.code}</span><span className="rounded-full bg-amber-50 px-3 py-1 text-amber-800">{course.accessPlan === "FREE" ? "Free" : course.accessPlan === "PREMIUM" ? "Premium" : "Corporate"}</span></div><h2 className="mt-4 text-xl font-bold text-slate-900">{course.title}</h2><p className="mt-3 flex-1 text-sm leading-6 text-slate-600">{course.shortDescription}</p><p className="mt-5 text-sm text-slate-500">{course.lessonCount} lessons · {course.estimatedDuration || "—"} min</p><Link href={getPublicCourseHref(course.slug)} className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">View course</Link></article>)}</section>}
  </main>;
}
