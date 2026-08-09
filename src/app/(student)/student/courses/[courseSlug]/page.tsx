import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/core/server/role-guard";
import { listLearnerCourses } from "@/modules/courses/services/learner-course.service";
import { DashboardBackButton } from "@/modules/teaching/components/DashboardBackButton";

export default async function StudentCoursePage({ params }: { params: Promise<{ courseSlug: string }> }) {
  const guard = await requireRole(["student"]);
  if (!guard.ok) notFound();
  const { courseSlug } = await params;
  const course = (await listLearnerCourses(guard.user.id)).find((item) => item.slug === courseSlug);
  if (!course) notFound();
  return <section className="space-y-6"><DashboardBackButton fallbackHref="/student/courses"/><header className="rounded-2xl border bg-white p-7"><p className="text-sm font-semibold text-blue-700">{course.level} · {course.category}</p><h2 className="mt-2 text-3xl font-bold text-slate-950">{course.title}</h2><p className="mt-3 max-w-2xl text-slate-600">{course.description}</p><p className="mt-5 text-sm text-slate-600">Progress: {course.progress}% · {course.completedLessons}/{course.totalLessons} lessons</p><Link href={`/courses/catalog/${course.slug}`} className="mt-5 inline-flex rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white">Open course overview</Link></header></section>;
}
