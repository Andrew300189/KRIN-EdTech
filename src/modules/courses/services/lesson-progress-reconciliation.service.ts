import { Prisma } from "@/generated/prisma-client-payments-runtime";
import { prisma } from "@/core/server/prisma";
import { isLessonProgressComplete } from "@/modules/lessons/utils/lesson-progress-state";
import { isSpacedReviewSettings } from "@/modules/lessons/utils/spaced-review";

function stringIdsFromJson(value: Prisma.JsonValue | null | undefined) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

/**
 * Repairs progress created by an older player which counted unpublished draft
 * blocks in its denominator. A learner can only ever complete the blocks that
 * were actually shown to them, so unpublished blocks must never keep a saved
 * lesson at (for example) 75% or lock the next lesson.
 *
 * Exercise blocks are additionally verified from immutable answer attempts.
 * This makes the repair safe when a tab was closed immediately after the last
 * answer, before React had a chance to flush its local block list.
 */
export async function reconcileLessonProgressFromPublishedBlocks(userId: string, lessonId: string) {
  const [progress, blocks] = await Promise.all([
    prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
      select: { id: true, status: true, completionPercent: true, completedBlocks: true, completedAt: true },
    }),
    prisma.lessonBlock.findMany({
      where: { lessonId, contentStatus: "PUBLISHED" },
      select: { id: true, isRequired: true, type: true, settings: true, exercises: { select: { id: true } } },
    }),
  ]);

  if (!progress || isLessonProgressComplete(progress) || blocks.length === 0) return false;

  const attemptedExerciseIds = new Set((await prisma.exerciseAttempt.findMany({
    where: { userId, lessonId },
    select: { exerciseId: true },
  })).map((attempt) => attempt.exerciseId));
  const completedBlockIds = new Set(stringIdsFromJson(progress.completedBlocks));

  for (const block of blocks) {
    if (block.exercises.length > 0 && block.exercises.every((exercise) => attemptedExerciseIds.has(exercise.id))) {
      completedBlockIds.add(block.id);
    }
  }

  const requiredBlocks = blocks.filter((block) => block.isRequired);
  if (requiredBlocks.length === 0 || requiredBlocks.some((block) => !completedBlockIds.has(block.id))) return false;

  const spacedReviewBlock = blocks.find((block) => block.type === "REVIEW" && isSpacedReviewSettings(block.settings));
  if (spacedReviewBlock) {
    const reviewCompleted = await prisma.lessonSpacedReviewRun.findFirst({
      where: { userId, lessonId, status: "COMPLETED" },
      select: { id: true },
    });
    if (!reviewCompleted) return false;
  }

  const publishedBlockIds = new Set(blocks.map((block) => block.id));
  const completedPublishedBlockIds = [...completedBlockIds].filter((blockId) => publishedBlockIds.has(blockId));
  const now = new Date();
  await prisma.lessonProgress.update({
    where: { id: progress.id },
    data: {
      status: "COMPLETED",
      completionPercent: 100,
      completedBlocks: completedPublishedBlockIds as Prisma.InputJsonValue,
      completedAt: progress.completedAt ?? now,
      lastSeenAt: now,
    },
  });
  return true;
}
