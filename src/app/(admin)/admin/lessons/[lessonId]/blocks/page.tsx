import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/core/server/prisma";
import { CmsLifecycleControls } from "@/modules/cms/components/CmsLifecycleControls";
import { AdminBlockForm, AdminExerciseForm } from "@/modules/courses/components/admin/ContentForms";

export default async function AdminLessonBlocksPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: (await params).lessonId },
    include: { blocks: { orderBy: { order: "asc" }, include: { exercises: { where: { isGeneratedReview: false }, orderBy: { order: "asc" } } } } },
  });
  if (!lesson) notFound();
  return <div><Link href={`/admin/lessons/${lesson.id}`} className="text-sm font-semibold text-blue-700 hover:underline">← Lesson overview</Link><h1 className="mt-4 text-3xl font-bold">Blocks: {lesson.title}</h1><p className="mt-2 text-sm text-slate-600">Blocks and exercises are drafts until published individually. This prevents unfinished changes from reaching learners.</p><AdminBlockForm lessonId={lesson.id} /><section className="mt-8 space-y-4">{lesson.blocks.map((block) => <article key={block.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{block.type}</p><h2 className="mt-1 text-xl font-bold">{block.title ?? "Untitled block"}</h2><p className="mt-2 text-sm text-gray-500">Order {block.order} · {block.isRequired ? "Required" : "Optional"} · {block.contentStatus}</p></div><CmsLifecycleControls entityType="LESSON_BLOCK" entityId={block.id} status={block.contentStatus} compact /></div>{block.exercises.length > 0 ? <ul className="mt-4 space-y-3 text-sm text-gray-700">{block.exercises.map((exercise) => <li key={exercise.id} className="rounded-lg border border-slate-100 p-3"><p>{exercise.order}. {exercise.type} · {exercise.engineKey} · {exercise.contentStatus}</p><p className="mt-1">{exercise.question}</p><div className="mt-2"><CmsLifecycleControls entityType="EXERCISE" entityId={exercise.id} status={exercise.contentStatus} compact /></div></li>)}</ul> : null}{block.type === "EXERCISE" ? <AdminExerciseForm blockId={block.id} /> : null}</article>)}</section></div>;
}
