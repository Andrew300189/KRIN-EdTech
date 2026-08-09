import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/core/server/prisma";
import { CmsLessonDetailsEditor, CmsLessonEnhancements } from "@/modules/cms/components/CmsLessonEditor";
import { CmsLifecycleControls } from "@/modules/cms/components/CmsLifecycleControls";
import { CmsPageShell } from "@/modules/cms/components/CmsPageShell";
import { LessonVocabularyManager } from "@/modules/vocabulary/components/LessonVocabularyManager";
import { listLessonVocabulary } from "@/modules/vocabulary/services/vocabulary.service";

export default async function CmsLessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const lessonId = (await params).lessonId;
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, include: { module: { include: { course: true } }, _count: { select: { blocks: true } } } });
  if (!lesson) notFound();
  const [vocabulary, siblings] = await Promise.all([
    listLessonVocabulary(lessonId),
    prisma.lesson.findMany({ where: { moduleId: lesson.moduleId }, orderBy: { order: "asc" }, select: { id: true, title: true, order: true } }),
  ]);
  return <CmsPageShell eyebrow="Lesson editor" title={lesson.title} description={lesson.description ?? "No description yet."} actions={<div className="flex flex-wrap gap-2"><Link href={`/cms/preview/lessons/${lesson.id}`} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-white">Preview</Link><Link href={`/cms/revisions?entityType=LESSON&entityId=${lesson.id}`} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-white">History</Link><CmsLifecycleControls entityType="LESSON" entityId={lesson.id} status={lesson.contentStatus} compact /></div>}><section className="grid gap-4 sm:grid-cols-4"><article className="rounded-xl border bg-white p-4"><p className="text-sm text-slate-500">Course</p><Link href={`/cms/courses/${lesson.module.course.id}`} className="mt-1 block font-semibold text-blue-700 hover:underline">{lesson.module.course.title}</Link></article><article className="rounded-xl border bg-white p-4"><p className="text-sm text-slate-500">Type</p><p className="mt-1 font-semibold">{lesson.type}</p></article><article className="rounded-xl border bg-white p-4"><p className="text-sm text-slate-500">Blocks</p><p className="mt-1 font-semibold">{lesson._count.blocks}</p></article><article className="rounded-xl border bg-white p-4"><p className="text-sm text-slate-500">Learner flow</p><p className="mt-1 font-semibold">{lesson.prerequisiteLessonId ? `Prerequisite · ${lesson.requiredPrerequisiteCompletion}%` : lesson.autoUnlockNextLesson ? "Auto next lesson" : "Manual continuation"}</p></article></section><CmsLessonDetailsEditor lesson={lesson} availableLessons={siblings} /><CmsLessonEnhancements lessonId={lesson.id} /><section className="mt-6 flex flex-wrap gap-3"><Link href={`/cms/lessons/${lesson.id}/blocks`} className="inline-flex rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800">Edit theory, materials and exercises</Link></section><LessonVocabularyManager lessonId={lesson.id} initial={vocabulary} /></CmsPageShell>;
}
