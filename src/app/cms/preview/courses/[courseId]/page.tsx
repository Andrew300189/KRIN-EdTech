import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/core/server/prisma";

export default async function CmsCoursePreviewPage({ params }: { params: Promise<{ courseId: string }> }) {
  const course = await prisma.course.findUnique({
    where: { id: (await params).courseId },
    include: {
      level: { select: { code: true, title: true } },
      category: { select: { title: true } },
      modules: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            include: {
              blocks: {
                orderBy: { order: "asc" },
                include: {
                  exercises: {
                    orderBy: { order: "asc" },
                    select: { id: true, type: true, engineKey: true, question: true, contentStatus: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!course) notFound();
  return <section><div className="flex flex-wrap items-center justify-between gap-4"><div><Link href="/cms/content" className="text-sm font-semibold text-blue-700 hover:underline">← Back to CMS content</Link><p className="mt-5 text-sm font-semibold uppercase tracking-wide text-blue-700">Preview · {course.level.code} · {course.category.title}</p><h1 className="mt-1 text-4xl font-bold text-slate-950">{course.title}</h1><p className="mt-3 max-w-3xl text-slate-600">{course.fullDescription || course.shortDescription}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">{course.contentStatus}</span></div><div className="mt-8 space-y-5">{course.modules.map((module) => <article key={module.id} className="rounded-2xl border border-slate-200 bg-white p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-blue-700">Module {module.order} · {module.contentStatus}</p><h2 className="mt-1 text-2xl font-bold text-slate-950">{module.title}</h2>{module.description ? <p className="mt-2 text-slate-600">{module.description}</p> : null}</div></div><div className="mt-5 space-y-4">{module.lessons.map((lesson) => <section key={lesson.id} className="rounded-xl border border-slate-200 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Lesson {lesson.order} · {lesson.type} · {lesson.contentStatus}</p><h3 className="mt-1 text-lg font-bold text-slate-950">{lesson.title}</h3>{lesson.description ? <p className="mt-2 text-sm text-slate-600">{lesson.description}</p> : null}<div className="mt-4 space-y-3">{lesson.blocks.map((block) => <div key={block.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3"><p className="text-xs font-semibold text-blue-700">{block.type} · {block.contentStatus}</p><p className="mt-1 font-medium text-slate-900">{block.title || "Untitled block"}</p>{block.exercises.map((exercise) => <div key={exercise.id} className="mt-2 rounded border border-slate-200 bg-white p-3"><p className="text-xs text-slate-500">{exercise.engineKey} · {exercise.type} · {exercise.contentStatus}</p><p className="mt-1 text-sm text-slate-800">{exercise.question}</p></div>)}</div>)}</div></section>)}{module.lessons.length === 0 ? <p className="text-sm text-slate-500">No lessons in this module.</p> : null}</div></article>)}{course.modules.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-slate-600">This course has no modules.</p> : null}</div></section>;
}
