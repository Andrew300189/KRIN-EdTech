import { notFound } from "next/navigation";
import { prisma } from "@/core/server/prisma";
import { CmsExerciseBlockOperations } from "@/modules/cms/components/CmsExerciseControls";
import { CmsLifecycleControls } from "@/modules/cms/components/CmsLifecycleControls";
import { CmsEmptyState, CmsPageShell } from "@/modules/cms/components/CmsPageShell";
import { AdminBlockForm, AdminExerciseForm } from "@/modules/courses/components/admin/ContentForms";

export default async function CmsLessonBlocksPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const lessonId = (await params).lessonId;
  const [lesson, targetLessons] = await Promise.all([
    prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        blocks: {
          orderBy: { order: "asc" },
          include: {
            exercises: {
              orderBy: { order: "asc" },
              include: { _count: { select: { attempts: true } } },
            },
          },
        },
      },
    }),
    prisma.lesson.findMany({
      take: 300,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        module: { select: { title: true, course: { select: { title: true } } } },
      },
    }),
  ]);

  if (!lesson) notFound();

  return (
    <CmsPageShell
      eyebrow="Lesson editor"
      title={`Blocks: ${lesson.title}`}
      description="Theory, media and exercises remain drafts until each item is published."
    >
      <AdminBlockForm lessonId={lesson.id} />

      {lesson.blocks.length === 0 ? (
        <CmsEmptyState description="Create a theory, material or exercise block for this lesson." />
      ) : (
        <section className="space-y-4">
          {lesson.blocks.map((block) => (
            <article key={block.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase text-blue-700">{block.type}</p>
                  <h2 className="mt-1 text-xl font-bold">{block.title ?? "Untitled block"}</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Order {block.order} · {block.isRequired ? "Required" : "Optional"}
                  </p>
                </div>
                <CmsLifecycleControls
                  entityType="LESSON_BLOCK"
                  entityId={block.id}
                  status={block.contentStatus}
                  compact
                />
              </div>

              {block.type === "EXERCISE" ? (
                <>
                  <CmsExerciseBlockOperations
                    lessonBlockId={block.id}
                    initialExercises={block.exercises}
                    targetLessons={targetLessons}
                  />
                  <AdminExerciseForm blockId={block.id} />
                </>
              ) : block.exercises.length ? (
                <p className="mt-4 text-sm text-amber-800">
                  Exercises must be managed inside an EXERCISE block.
                </p>
              ) : null}
            </article>
          ))}
        </section>
      )}
    </CmsPageShell>
  );
}
