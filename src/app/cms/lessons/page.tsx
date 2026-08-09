import Link from "next/link";
import { prisma } from "@/core/server/prisma";
import { CmsLifecycleControls } from "@/modules/cms/components/CmsLifecycleControls";
import { CmsEmptyState, CmsPageShell } from "@/modules/cms/components/CmsPageShell";

export default async function CmsLessonsPage() {
  const lessons = await prisma.lesson.findMany({
    take: 200,
    orderBy: { updatedAt: "desc" },
    include: {
      module: { select: { course: { select: { id: true, title: true, level: { select: { code: true } } } } } },
      _count: { select: { blocks: true } },
    },
  });
  return <CmsPageShell eyebrow="Learning content" title="Lessons" description="Review the latest edited lessons across the curriculum. Use the course editor to add a new lesson.">{lessons.length === 0 ? <CmsEmptyState description="No lessons exist yet. Create a module first." /> : <div className="space-y-3">{lessons.map((lesson) => <article key={lesson.id} className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5"><div><p className="text-xs font-semibold text-blue-700">{lesson.module.course.level.code} · <Link href={`/cms/courses/${lesson.module.course.id}`} className="hover:underline">{lesson.module.course.title}</Link></p><Link href={`/cms/lessons/${lesson.id}`} className="mt-1 block text-lg font-bold text-slate-950 hover:text-blue-700">{lesson.title}</Link><p className="mt-1 text-sm text-slate-600">{lesson.type} · {lesson._count.blocks} blocks · {lesson.estimatedDuration} minutes</p></div><CmsLifecycleControls entityType="LESSON" entityId={lesson.id} status={lesson.contentStatus} compact /></article>)}</div>}</CmsPageShell>;
}
