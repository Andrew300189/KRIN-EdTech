import { randomUUID } from "node:crypto";
import { Prisma } from "@/generated/prisma-client-payments-runtime";
import { prisma } from "@/core/server/prisma";
import { GRAMMAR_TYPICAL_LESSON_TEMPLATE } from "@/modules/cms/data/grammar-typical-lesson-template";

function inputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

/**
 * Instantiates the authoring blueprint as an isolated draft in the selected
 * module. It never changes existing lessons, learner progress or published
 * content, and it records the creation for CMS history/audit views.
 */
export async function instantiateGrammarTypicalLessonTemplate(actorId: string, targetModuleId: string) {
  const targetModule = await prisma.courseModule.findUnique({
    where: { id: targetModuleId },
    select: { id: true, courseId: true },
  });
  if (!targetModule) throw new Error("Target module not found.");

  const blueprint = GRAMMAR_TYPICAL_LESSON_TEMPLATE;
  const slug = `grammar-typical-lesson-${randomUUID().slice(0, 8)}`;

  return prisma.$transaction(async (tx) => {
    const lastLesson = await tx.lesson.findFirst({
      where: { moduleId: targetModule.id },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    const lesson = await tx.lesson.create({
      data: {
        moduleId: targetModule.id,
        slug,
        title: blueprint.title,
        description: blueprint.description,
        type: "GRAMMAR",
        order: (lastLesson?.order ?? 0) + 1,
        estimatedDuration: blueprint.estimatedDuration,
        learningObjectives: inputJson(blueprint.learningObjectives),
        previewText: blueprint.previewText,
        isPublished: false,
        contentStatus: "DRAFT",
        isFree: false,
        blocks: {
          create: [
            {
              type: "THEORY",
              title: blueprint.theory.title,
              content: inputJson(blueprint.theory.content),
              order: 1,
              isRequired: true,
              contentStatus: "DRAFT",
            },
            ...blueprint.exercises.map((exercise, index) => ({
              type: "EXERCISE" as const,
              title: exercise.blockTitle,
              order: index + 2,
              isRequired: true,
              contentStatus: "DRAFT" as const,
              exercises: {
                create: {
                  type: exercise.type,
                  engineKey: exercise.engineKey,
                  variantKey: exercise.variantKey,
                  instruction: exercise.instruction,
                  question: exercise.question,
                  content: inputJson(exercise.content),
                  correctAnswer: inputJson(exercise.correctAnswer),
                  alternativeAnswers: "alternativeAnswers" in exercise ? inputJson(exercise.alternativeAnswers) : undefined,
                  explanation: exercise.explanation,
                  hint: exercise.hint,
                  hintsEnabled: true,
                  difficulty: exercise.difficulty,
                  basePoints: exercise.basePoints,
                  allowInstantCheck: true,
                  allowExtraExercise: false,
                  contentStatus: "DRAFT" as const,
                  order: 1,
                },
              },
            })),
          ],
        },
      },
      select: { id: true, title: true },
    });
    await tx.course.update({ where: { id: targetModule.courseId }, data: { lessonCount: { increment: 1 } } });
    await tx.cmsContentVersion.create({
      data: {
        entityType: "LESSON",
        entityId: lesson.id,
        version: 1,
        action: "CREATED",
        snapshot: inputJson({ templateKey: blueprint.key, targetModuleId }),
        actorId,
      },
    });
    await tx.contentAuditLog.create({
      data: {
        actorId,
        action: "CMS_LESSON_CREATED_FROM_BLUEPRINT",
        entityType: "Lesson",
        entityId: lesson.id,
        metadata: inputJson({ templateKey: blueprint.key, targetModuleId }),
      },
    });
    return { ...lesson, courseId: targetModule.courseId };
  });
}
