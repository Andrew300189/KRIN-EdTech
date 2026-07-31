import Link from "next/link";
import { requireRole } from "@/core/server/role-guard";
import { listLearnerCourses } from "@/modules/courses/services/learner-course.service";

export default async function StudentHomePage() {
  const guard = await requireRole(["student"]); if (!guard.ok) return null;
  const courses = await listLearnerCourses(guard.user.id);
  const next = courses.find((course) => course.nextLesson) ?? courses[0];
  return <section className="space-y-6"><div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-6"><p className="text-sm font-semibold text-blue-700">Your next step</p><h2 className="mt-2 text-3xl font-bold">{next ? `Continue ${next.title}` : "Choose your first course"}</h2><p className="mt-2 text-slate-600">Keep moving with one small, focused learning action.</p><Link href={next ? "/student/courses" : "/student/catalog"} className="mt-5 inline-flex rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800">{next ? "Continue learning" : "Browse catalog"}</Link></div><div className="grid gap-4 sm:grid-cols-3"><article className="rounded-xl border bg-white p-5"><p className="text-sm text-slate-500">My courses</p><p className="mt-2 text-3xl font-bold">{courses.length}</p></article><article className="rounded-xl border bg-white p-5"><p className="text-sm text-slate-500">In progress</p><p className="mt-2 text-3xl font-bold">{courses.filter((course) => course.progress > 0 && course.progress < 100).length}</p></article><article className="rounded-xl border bg-white p-5"><p className="text-sm text-slate-500">Completed</p><p className="mt-2 text-3xl font-bold">{courses.filter((course) => course.progress === 100).length}</p></article></div></section>;
}
