import Link from "next/link";
import { requireRole } from "@/core/server/role-guard";
import { prisma } from "@/core/server/prisma";
import { CmsManagedSlotBanner } from "@/modules/cms/components/CmsManagedSlotBanner";
import { CmsStudentCourseRecommendations } from "@/modules/cms/components/CmsStudentCourseRecommendations";
import { getPublishedCmsContentSlot } from "@/modules/cms/services/content-slot.service";
import { listLearnerCourses } from "@/modules/courses/services/learner-course.service";

export default async function StudentHomePage() {
  const guard = await requireRole(["student"]);
  if (!guard.ok) return null;

  const [courses, assignmentCount, reviewCount, managedSlot] = await Promise.all([
    listLearnerCourses(guard.user.id),
    prisma.assignmentSubmission.count({ where: { studentId: guard.user.id, status: { in: ["NOT_STARTED", "IN_PROGRESS", "NEEDS_REVISION"] } } }),
    prisma.userWord.count({ where: { userId: guard.user.id, status: { in: ["LEARNING", "REVIEW"] } } }),
    getPublishedCmsContentSlot("student.welcome"),
  ]);

  const next = courses.find((course) => course.nextLesson) ?? courses[0];
  const name = guard.user.firstName || guard.user.name?.split(" ")[0] || "Learner";
  const completed = courses.filter((course) => course.progress === 100).length;
  const completedLessons = courses.reduce((sum, course) => sum + course.completedLessons, 0);
  const totalLessons = courses.reduce((sum, course) => sum + course.totalLessons, 0);
  const progress = totalLessons ? Math.round(courses.reduce((sum, course) => sum + course.progress * course.totalLessons, 0) / totalLessons) : 0;
  const stats = [
    ["My courses", courses.length],
    ["Lessons completed", completedLessons],
    ["Overall progress", `${progress}%`],
    ["Words to review", reviewCount],
    ["Homework", assignmentCount],
    ["Completed courses", completed],
  ];

  return <section className="space-y-7">
    <CmsManagedSlotBanner slot={managedSlot} />
    <div className="rounded-3xl border border-blue-100 bg-blue-50/60 p-7 md:p-9">
      <p className="text-sm font-semibold text-blue-700">WELCOME BACK</p>
      <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Welcome, {name}</h2>
      <p className="mt-3 max-w-xl text-slate-600">Continue from where you left off with one focused learning step.</p>
      <Link href={next ? `/student/courses/${next.slug}` : "/student/catalog"} className="mt-6 inline-flex rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800">{next ? "Continue learning" : "Choose a course"}</Link>
    </div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{stats.map(([label, value]) => <article key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold text-slate-950">{value}</p></article>)}</div>
    <section className="grid gap-4 lg:grid-cols-2">
      <article className="rounded-2xl border bg-white p-6"><h3 className="text-lg font-bold">Current course</h3>{next ? <><p className="mt-3 font-semibold">{next.title}</p><p className="mt-1 text-sm text-slate-600">Next lesson: {next.nextLesson?.title ?? "Review completed lessons"}</p><Link href={`/student/courses/${next.slug}`} className="mt-4 inline-flex text-sm font-semibold text-blue-700 hover:underline">Open course →</Link></> : <p className="mt-3 text-sm text-slate-600">Add a course to begin your learning plan.</p>}</article>
      <article className="rounded-2xl border bg-white p-6"><h3 className="text-lg font-bold">Recommended next step</h3><p className="mt-3 text-sm text-slate-600">Explore levels A1–C2 or search for a topic that you want to practise.</p><div className="mt-4 flex gap-3"><Link href="/student/levels" className="text-sm font-semibold text-blue-700 hover:underline">Browse levels</Link><Link href="/student/search" className="text-sm font-semibold text-blue-700 hover:underline">Search topics</Link></div></article>
    </section>
    <CmsStudentCourseRecommendations />
  </section>;
}
