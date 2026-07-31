import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedLevelWithCourses } from "@/modules/courses/services/content.service";

export default async function LevelCoursesPage({ params }: { params: Promise<{ levelCode: string }> }) {
  const { levelCode } = await params;
  const level = await getPublishedLevelWithCourses(levelCode);
  if (!level) notFound();
  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <Link href="/levels" className="text-sm font-semibold text-blue-700 hover:underline">← All levels</Link>
      <header className="mt-5"><p className="text-sm font-semibold uppercase tracking-wide text-blue-700">{level.code}</p><h1 className="mt-2 text-4xl font-bold text-slate-900">{level.title} courses</h1><p className="mt-3 max-w-2xl text-slate-600">{level.description}</p></header>
      {level.courses.length === 0 ? <p className="mt-8 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-slate-600">Published courses for this level are being prepared.</p> : <section className="mt-8 grid gap-5 md:grid-cols-2" aria-label={`${level.code} courses`}>{level.courses.map((course) => <Link key={course.slug} href={`/courses/${course.slug}`} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"><p className="text-sm font-semibold text-blue-700">{course.accessPlan === "FREE" ? "Free" : "Premium"}</p><h2 className="mt-2 text-2xl font-bold text-slate-900">{course.title}</h2><p className="mt-3 text-slate-600">{course.shortDescription}</p><p className="mt-5 text-sm text-slate-500">{course.lessonCount} lessons · {course.estimatedDuration || "—"} min</p></Link>)}</section>}
    </main>
  );
}
