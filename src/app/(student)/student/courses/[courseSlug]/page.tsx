import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/core/server/role-guard";
import { listLearnerCourses } from "@/modules/courses/services/learner-course.service";
import { learnerCourseContinueHref } from "@/modules/courses/utils/learner-course-path";
import { DashboardBackButton } from "@/modules/teaching/components/DashboardBackButton";

export default async function StudentCoursePage({ params }: { params: Promise<{ courseSlug: string }> }) {
  const guard = await requireRole(["student"]);
  if (!guard.ok) notFound();

  const { courseSlug } = await params;
  const course = (await listLearnerCourses(guard.user.id)).find((item) => item.slug === courseSlug);
  if (!course) notFound();

  const continueHref = learnerCourseContinueHref(course);

  return (
    <section className="space-y-6">
      <DashboardBackButton fallbackHref="/student/courses" />
      <header className="rounded-2xl border bg-white p-7">
        <p className="text-sm font-semibold text-blue-700">{course.level} · {course.category}</p>
        <h2 className="mt-2 text-3xl font-bold text-slate-950">{course.title}</h2>
        <p className="mt-3 max-w-2xl text-slate-600">{course.description}</p>
        <p className="mt-5 text-sm text-slate-600">Progress: {course.progress}% · {course.completedLessons}/{course.totalLessons} lessons</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href={continueHref} className="inline-flex rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white">
            {course.nextLesson ? "Continue lesson" : "Review course"}
          </Link>
          <Link href={`/courses/${encodeURIComponent(course.slug)}`} className="inline-flex rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700">
            Open course overview
          </Link>
        </div>
      </header>
    </section>
  );
}
