import "server-only";

import { Prisma } from "@/generated/prisma-client-payments-runtime";
import { prisma } from "@/core/server/prisma";
import { recordCmsContentVersion } from "@/modules/cms/services/content-workflow.service";

const GRAMMAR_DRAFT_COUNT = 12;

function json(value: Record<string, unknown>) {
  return value as Prisma.InputJsonValue;
}

/**
 * Creates an intentionally non-publishable authoring set. The CMS validation
 * recognises `authoringPlaceholder`, so an author must replace every draft
 * prompt before learners can see it. This prevents a bulk operation from
 * accidentally becoming fabricated live learning content.
 */
export async function createGrammarExerciseDraftSet(actorId: string, blockId: string) {
  const block = await prisma.lessonBlock.findUnique({
    where: { id: blockId },
    include: {
      exercises: { where: { isGeneratedReview: false }, select: { id: true } },
      grammarSkills: { select: { grammarSkillId: true } },
      lesson: {
        select: {
          id: true,
          grammarSkills: { select: { grammarSkillId: true } },
          module: { select: { courseId: true } },
        },
      },
    },
  });
  if (!block) throw new Error("Lesson block not found.");
  if (block.type !== "EXERCISE") throw new Error("Twelve grammar drafts can only be created in an exercise block.");
  if (block.exercises.length) throw new Error("This exercise block already contains activities. Create a new practice block for a fresh twelve-draft set.");

  const grammarSkillIds = [...new Set([
    ...block.grammarSkills.map((link) => link.grammarSkillId),
    ...block.lesson.grammarSkills.map((link) => link.grammarSkillId),
  ])];
  if (!grammarSkillIds.length) throw new Error("Link at least one measurable grammar skill to the lesson before creating its practice set.");

  const created = await prisma.$transaction(async (tx) => {
    await tx.lessonBlock.update({
      where: { id: block.id },
      data: {
        requiresTwelveExercises: true,
        grammarSkills: block.grammarSkills.length
          ? undefined
          : { create: grammarSkillIds.map((grammarSkillId) => ({ grammarSkillId })) },
      },
    });

    const exercises = await Promise.all(Array.from({ length: GRAMMAR_DRAFT_COUNT }, async (_, index) => tx.exercise.create({
      data: {
        lessonBlockId: block.id,
        type: "TEXT_INPUT",
        engineKey: "text-input",
        variantKey: "SHORT_ANSWER",
        instruction: `Draft ${index + 1}: replace this instruction with a focused grammar task.`,
        question: `Draft ${index + 1}: write the expected learner prompt here.`,
        content: json({
          authoringPlaceholder: true,
          authoringNote: "Replace the prompt, accepted answer, explanation and hint before publishing.",
          acceptedAnswers: ["replace-me"],
        }),
        correctAnswer: "replace-me",
        explanation: "Authoring placeholder: explain why the learner answer is correct before publication.",
        hint: "Authoring placeholder: add a concise, optional hint.",
        hintsEnabled: true,
        difficulty: 1,
        basePoints: 1,
        allowInstantCheck: true,
        allowExtraExercise: false,
        order: index + 1,
        grammarSkills: { create: grammarSkillIds.map((grammarSkillId) => ({ grammarSkillId })) },
      },
    })));

    await tx.contentAuditLog.create({
      data: {
        actorId,
        action: "GRAMMAR_EXERCISE_DRAFT_SET_CREATED",
        entityType: "LessonBlock",
        entityId: block.id,
        metadata: json({ courseId: block.lesson.module.courseId, lessonId: block.lesson.id, count: exercises.length, grammarSkillIds }),
      },
    });
    return exercises;
  });

  await recordCmsContentVersion({
    actorId,
    entityType: "LESSON_BLOCK",
    entityId: block.id,
    action: "UPDATED",
    snapshot: { operation: "grammar-exercise-draft-set", count: created.length, grammarSkillIds },
  });
  await Promise.all(created.map((exercise) => recordCmsContentVersion({
    actorId,
    entityType: "EXERCISE",
    entityId: exercise.id,
    action: "CREATED",
    snapshot: exercise,
  })));
  return { blockId: block.id, exerciseIds: created.map((exercise) => exercise.id), count: created.length };
}

