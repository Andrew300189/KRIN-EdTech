import Link from "next/link";
import { prisma } from "@/core/server/prisma";
import { CmsPageShell } from "@/modules/cms/components/CmsPageShell";

export default async function CmsSearchPage() {
  const [publishedCourses, publishedLessons, grammarTopics] = await Promise.all([prisma.course.count({ where: { isPublished: true } }), prisma.lesson.count({ where: { isPublished: true } }), prisma.grammarTopic.count({ where: { contentStatus: "PUBLISHED" } })]);
  return <CmsPageShell eyebrow="Discovery" title="Search coverage" description="Search indexes published database courses, lessons, categories and grammar topics; drafts and archived content stay hidden."><div className="grid gap-4 sm:grid-cols-3">{[["Courses", publishedCourses], ["Lessons", publishedLessons], ["Grammar topics", grammarTopics]].map(([label, value]) => <article key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold text-slate-950">{value}</p></article>)}</div><Link href="/admin/analytics" className="inline-flex text-sm font-semibold text-blue-700 hover:underline">Open search analytics</Link></CmsPageShell>;
}
