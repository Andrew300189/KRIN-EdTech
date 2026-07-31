import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/core/server/prisma";
import { LessonVocabularyManager } from "@/modules/vocabulary/components/LessonVocabularyManager";
import { listLessonVocabulary } from "@/modules/vocabulary/services/vocabulary.service";

export default async function AdminLessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const lessonId = (await params).lessonId;
  const [lesson, vocabulary] = await Promise.all([
    prisma.lesson.findUnique({ where: { id: lessonId }, include: { module: { include: { course: true } }, _count: { select: { blocks: true } } } }),
    listLessonVocabulary(lessonId),
  ]);
  if (!lesson) notFound();
  return <div><Link href={`/admin/courses/${lesson.module.course.id}`} className="text-sm font-semibold text-blue-700 hover:underline">← {lesson.module.course.title}</Link><h1 className="mt-4 text-3xl font-bold">{lesson.title}</h1><p className="mt-2 text-gray-600">{lesson.description ?? "No description yet."}</p><dl className="mt-6 grid gap-4 sm:grid-cols-3"><div className="rounded-xl border border-gray-200 bg-white p-4"><dt className="text-sm text-gray-500">Type</dt><dd className="mt-1 font-semibold">{lesson.type}</dd></div><div className="rounded-xl border border-gray-200 bg-white p-4"><dt className="text-sm text-gray-500">Blocks</dt><dd className="mt-1 font-semibold">{lesson._count.blocks}</dd></div><div className="rounded-xl border border-gray-200 bg-white p-4"><dt className="text-sm text-gray-500">Status</dt><dd className="mt-1 font-semibold">{lesson.isPublished ? "Published" : "Draft"}</dd></div></dl><Link href={`/admin/lessons/${lesson.id}/blocks`} className="mt-6 inline-flex rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800">Edit lesson blocks</Link><LessonVocabularyManager lessonId={lesson.id} initial={vocabulary} /></div>;
}
