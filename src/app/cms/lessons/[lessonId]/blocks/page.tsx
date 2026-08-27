import { notFound } from "next/navigation";
import { prisma } from "@/core/server/prisma";
import { CmsExerciseBlockOperations } from "@/modules/cms/components/CmsExerciseControls";
import { CmsLessonAdvancedSettings } from "@/modules/cms/components/CmsLessonAdvancedSettings";
import { CmsLifecycleControls } from "@/modules/cms/components/CmsLifecycleControls";
import { CmsLessonBlockEditor } from "@/modules/cms/components/CmsLessonBlockEditor";
import { CmsLessonStepPlayer } from "@/modules/cms/components/CmsLessonStepPlayer";
import { CmsEmptyState, CmsPageShell } from "@/modules/cms/components/CmsPageShell";
import { InlineLessonTitleEditor } from "@/modules/cms/components/CmsLessonEditor";
import { AdminBlockForm, AdminExerciseForm } from "@/modules/courses/components/admin/ContentForms";
import { CmsLessonGrammarManager } from "@/modules/grammar/components/CmsLessonGrammarManager";
import { listLessonGrammarTopics } from "@/modules/grammar/services/grammar-cms.service";

export default async function CmsLessonBlocksPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const lessonId = (await params).lessonId;
  const [lesson, targetLessons, grammarLinks, grammarTopics] = await Promise.all([
    prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        blocks: {
          where: { contentStatus: { not: "ARCHIVED" } },
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
    listLessonGrammarTopics(lessonId),
    prisma.grammarTopic.findMany({
      where: { archivedAt: null },
      orderBy: [{ cefrLevel: "asc" }, { order: "asc" }, { title: "asc" }],
      select: { id: true, title: true, cefrLevel: true },
    }),
  ]);

  if (!lesson) notFound();

  const titleNode = <InlineLessonTitleEditor lessonId={lesson.id} initialTitle={lesson.title} />;

  return (
    <CmsPageShell
      eyebrow="Lesson editor"
      title={titleNode}
      description="Build and test one learner-facing step at a time."
      dense
      actions={(
        <CmsLessonAdvancedSettings>
          <p className="text-sm text-slate-600">Use these controls for specialised blocks, publishing, grammar links and the complete exercise catalogue.</p>
          <AdminBlockForm lessonId={lesson.id} />
          <CmsLessonGrammarManager lessonId={lesson.id} initial={grammarLinks} topics={grammarTopics} />

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
                  <CmsLessonBlockEditor block={block} orderedBlockIds={lesson.blocks.map((item) => item.id)} />

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
                    <p className="mt-4 text-sm text-amber-800">Exercises must be managed inside an EXERCISE block.</p>
                  ) : null}
                </article>
              ))}
            </section>
          )}
        </CmsLessonAdvancedSettings>
      )}
    >
      <CmsLessonStepPlayer lessonId={lesson.id} blocks={lesson.blocks} />
    </CmsPageShell>
  );
}
