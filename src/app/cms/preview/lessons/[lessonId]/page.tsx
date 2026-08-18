import { notFound } from "next/navigation";
import { prisma } from "@/core/server/prisma";
import { LessonPlayer } from "@/modules/lessons/components/LessonPlayer";

/**
 * The protected CMS preview deliberately reuses the learner Focus Mode.
 * Correct answers remain in this server-rendered author view and are evaluated
 * locally by the preview renderer; they are never exposed on a public route.
 */
export default async function CmsLessonPreviewPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const lessonId = (await params).lessonId;
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: { include: { course: { select: { title: true, slug: true } } } },
      blocks: { orderBy: { order: "asc" }, include: { exercises: { orderBy: { order: "asc" } } } },
    },
  });
  if (!lesson) notFound();

  return (
    <LessonPlayer
      lessonId={lesson.id}
      courseSlug={lesson.module.course.slug}
      moduleTitle={lesson.module.title}
      title={lesson.title}
      estimatedDuration={lesson.estimatedDuration}
      objectives={lesson.learningObjectives}
      blocks={lesson.blocks}
      lessons={[{ slug: lesson.slug, title: lesson.title, order: lesson.order }]}
      currentSlug={lesson.slug}
      canSaveProgress={false}
      previewMode
      returnHref={`/cms/lessons/${lesson.id}`}
    />
  );
}
