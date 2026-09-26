import { randomInt } from "crypto";
import { Prisma } from "@/generated/prisma-client-payments-runtime";
import { grantEconomyReward } from "./motivation.service";
import { correctAnswerStreak } from "../utils/correct-answer-streak";
import { selectRandomFlowerChest } from "../utils/flower-chests";

type Tx = Prisma.TransactionClient;

/** Per-review streak and rewards are keyed to persisted mistake items. A
 * crafted reviewRun query parameter cannot claim somebody else's XP. */
export async function recordMistakeReviewAnswer(tx: Tx, input: { userId: string; runId: string; lessonId: string; exerciseId: string; isCorrect: boolean }) {
  await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${`mistake-review:${input.runId}`}))`);
  const item = await tx.mistakeReviewRunItem.findFirst({
    where: {
      runId: input.runId, resolvedAt: null,
      run: { userId: input.userId, status: "ACTIVE" },
      mistake: { userId: input.userId, lessonId: input.lessonId, exerciseId: input.exerciseId },
    },
    select: { id: true, mistakeId: true, hadWrongAttempt: true, run: { select: { correctStreak: true, bestCorrectStreak: true } } },
  });
  if (!item) return null;

  if (!input.isCorrect) {
    await tx.mistakeReviewRunItem.update({ where: { id: item.id }, data: { hadWrongAttempt: true } });
    await tx.mistakeReviewRun.update({ where: { id: input.runId }, data: { correctStreak: 0 } });
    return { correctedExperience: 0, currentStreak: 0, bestStreak: item.run.bestCorrectStreak, chest: null };
  }

  await tx.mistakeReviewRunItem.update({ where: { id: item.id }, data: { resolvedAt: new Date() } });
  const correction = await grantEconomyReward(tx, {
    userId: input.userId, experience: 2, sourceType: "MISTAKE_CORRECTION", sourceId: item.mistakeId,
    idempotencyKey: `mistake-correction:${input.userId}:${item.mistakeId}`,
    description: "Corrected a saved mistake in My Mistakes",
  });
  const currentStreak = item.hadWrongAttempt ? 0 : item.run.correctStreak + 1;
  const bestStreak = Math.max(item.run.bestCorrectStreak, currentStreak);
  await tx.mistakeReviewRun.update({ where: { id: input.runId }, data: { correctStreak: currentStreak, bestCorrectStreak: bestStreak } });

  const milestone = correctAnswerStreak(currentStreak);
  if (!milestone.activated || !milestone.modeStart) return { correctedExperience: correction.experience, currentStreak, bestStreak, chest: null };

  await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${`flower-chest:${input.userId}`}))`);
  const previous = await tx.experienceTransaction.findFirst({
    where: { userId: input.userId, sourceType: { in: ["STREAK_CHEST", "MISTAKE_REVIEW_CHEST", "MISTAKE_ACHIEVEMENT"] }, description: { contains: "flower:" } },
    orderBy: { createdAt: "desc" }, select: { description: true },
  });
  const lastFlowerId = previous?.description?.match(/flower:([a-z-]+)/u)?.[1] ?? null;
  const flower = selectRandomFlowerChest(lastFlowerId, randomInt);
  const chestExperience = Math.min(100, 10 + currentStreak * 2);
  const chest = await grantEconomyReward(tx, {
    userId: input.userId, experience: chestExperience, sourceType: "MISTAKE_REVIEW_CHEST",
    sourceId: `${input.runId}:${currentStreak}`,
    idempotencyKey: `mistake-review-chest:${input.userId}:${input.runId}:${currentStreak}`,
    description: `Mistake review flower chest | flower:${flower.id} | water-lily:1`,
  });
  if (chest.awarded) await tx.userStreak.upsert({ where: { userId: input.userId }, create: { userId: input.userId, waterLilyCount: 1 }, update: { waterLilyCount: { increment: 1 } } });
  return { correctedExperience: correction.experience, currentStreak, bestStreak,
    chest: chest.awarded ? { flowerId: flower.id, experience: chest.experience, waterLily: 1, milestone: currentStreak } : null };
}
