import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/core/server/prisma";
import { AdminBlockForm, AdminExerciseForm } from "@/modules/courses/components/admin/ContentForms";

export default async function AdminLessonBlocksPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const lesson = await prisma.lesson.findUnique({ where: { id: (await params).lessonId }, include: { blocks: { orderBy: { order: "asc" }, include: { exercises: { orderBy: { order: "asc" } } } } } });
  if (!lesson) notFound();
  return <div><Link href={`/admin/lessons/${lesson.id}`} className="text-sm font-semibold text-blue-700 hover:underline">← Lesson overview</Link><h1 className="mt-4 text-3xl font-bold">Blocks: {lesson.title}</h1><AdminBlockForm lessonId={lesson.id} /><section className="mt-8 space-y-4">{lesson.blocks.map((block) => <article key={block.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{block.type}</p><h2 className="mt-1 text-xl font-bold">{block.title ?? "Untitled block"}</h2><p className="mt-2 text-sm text-gray-500">Order {block.order} · {block.isRequired ? "Required" : "Optional"}</p>{block.exercises.length > 0 ? <ul className="mt-4 space-y-2 text-sm text-gray-700">{block.exercises.map((exercise) => <li key={exercise.id}>{exercise.order}. {exercise.type}: {exercise.question}</li>)}</ul> : null}{block.type === "EXERCISE" ? <AdminExerciseForm blockId={block.id} /> : null}</article>)}</section></div>;
}
