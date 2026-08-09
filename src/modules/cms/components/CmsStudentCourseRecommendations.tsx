import Link from "next/link";
import { listStudentDashboardRecommendations } from "@/modules/courses/services/content.service";
import { getPublicCourseHref } from "@/modules/courses/utils/public-content-routes";

/**
 * A small server-rendered discovery module for the student dashboard.
 * It deliberately does not grant access: the learner still meets the normal
 * course/lesson entitlement guard after following a link.
 */
export async function CmsStudentCourseRecommendations() {
  const courses = await listStudentDashboardRecommendations();
  if (!courses.length) return null;

  return <section className="rounded-2xl border border-slate-200 bg-white p-6">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Recommended for you</p><h3 className="mt-1 text-xl font-bold text-slate-950">Continue exploring</h3></div>
      <Link href="/student/catalog" className="text-sm font-semibold text-blue-700 hover:underline">Browse catalog</Link>
    </div>
    <div className="mt-5 grid gap-4 md:grid-cols-3">{courses.map((course) => <Link key={course.id} href={getPublicCourseHref(course.slug)} className="rounded-xl border border-slate-200 p-4 transition hover:border-blue-300 hover:bg-blue-50"><p className="text-xs font-bold text-blue-700">{course.level.code} · {course.accessPlan === "FREE" ? "Free" : "Premium"}</p><h4 className="mt-2 font-bold text-slate-950">{course.title}</h4><p className="mt-2 text-sm text-slate-600">{course.shortDescription}</p></Link>)}</div>
  </section>;
}
