import { notFound } from "next/navigation";
import { prisma } from "@/core/server/prisma";
import { CmsLessonStepPlayer } from "@/modules/cms/components/CmsLessonStepPlayer";
import { CmsPageShell } from "@/modules/cms/components/CmsPageShell";
import { InlineLessonTitleEditor } from "@/modules/cms/components/CmsLessonEditor";

export default async function CmsLessonBlocksPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const lessonId = (await params).lessonId;
  const lesson = await prisma.lesson.findUnique({
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
  });

  if (!lesson) notFound();

  const titleNode = <InlineLessonTitleEditor lessonId={lesson.id} initialTitle={lesson.title} />;

  return (
    <CmsPageShell
      eyebrow="Lesson editor"
      title={titleNode}
      description="Build and test one learner-facing step at a time."
      dense
    >
      <CmsLessonStepPlayer lessonId={lesson.id} blocks={lesson.blocks} />
    </CmsPageShell>
  );
}
