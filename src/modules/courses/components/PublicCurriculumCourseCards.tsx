import Link from "next/link";

export type PublicCurriculumCourse = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  lessonCount: number;
  estimatedDuration: number;
  accessPlan: string;
  category: { title: string };
};

function accessLabel(accessPlan: PublicCurriculumCourse["accessPlan"]) {
  return accessPlan === "FREE" ? "Free" : accessPlan === "PREMIUM" ? "Premium" : accessPlan === "CORPORATE" ? "Corporate" : accessPlan;
}

export function PublicCurriculumCourseCards({ courses }: { courses: PublicCurriculumCourse[] }) {
  if (!courses.length) return <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-slate-600">A course for this exact curriculum area has not been published yet. Content from another level is never substituted.</p>;
  return <section className="grid gap-4 md:grid-cols-2" aria-label="Related courses">
    {courses.map((course) => <article key={course.id} className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap gap-2 text-xs font-semibold"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">{course.category.title}</span><span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-800">{accessLabel(course.accessPlan)}</span></div>
      <h2 className="mt-3 text-lg font-bold text-slate-900">{course.title}</h2>
      <p className="mt-2 flex-1 text-sm text-slate-600">{course.shortDescription}</p>
      <p className="mt-4 text-xs text-slate-500">{course.lessonCount} lessons · {course.estimatedDuration || "—"} min</p>
      <Link href={`/courses/${course.slug}`} className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">View course</Link>
    </article>)}
  </section>;
}
