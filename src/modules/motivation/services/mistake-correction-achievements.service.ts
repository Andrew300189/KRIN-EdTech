import { randomInt } from "crypto";
import { Prisma } from "@/generated/prisma-client-payments-runtime";
import { prisma } from "@/core/server/prisma";
import { grantEconomyReward } from "./motivation.service";
import { selectRandomFlowerChest } from "../utils/flower-chests";

export const MISTAKE_CORRECTION_MILESTONES = [3, 7, 12, 24, 48, 70, 100, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 800, 900, 1000] as const;

export async function getMistakeCorrectionAchievementState(userId: string) {
  const [corrected, claims] = await Promise.all([
    prisma.experienceTransaction.count({ where: { userId, sourceType: "MISTAKE_CORRECTION" } }),
    prisma.experienceTransaction.findMany({ where: { userId, sourceType: "MISTAKE_ACHIEVEMENT" }, select: { sourceId: true } }),
  ]);
  const claimed = new Set(claims.map((claim) => Number(claim.sourceId)));
  return { corrected, milestones: MISTAKE_CORRECTION_MILESTONES.map((target) => ({ target, ready: corrected >= target && !claimed.has(target), claimed: claimed.has(target), experience: Math.min(500, Math.max(10, target * 2)) })) };
}

export async function claimMistakeCorrectionAchievement(userId: string, target: number) {
  if (!MISTAKE_CORRECTION_MILESTONES.includes(target as typeof MISTAKE_CORRECTION_MILESTONES[number])) throw new Error("Unknown achievement.");
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${`mistake-achievement:${userId}`}))`);
    const idempotencyKey = `mistake-achievement:${userId}:${target}`;
    const existing = await tx.experienceTransaction.findUnique({ where: { idempotencyKey }, select: { id: true } });
    if (existing) return { awarded: false, experience: 0, waterLily: 0, flowerId: null };
    const corrected = await tx.experienceTransaction.count({ where: { userId, sourceType: "MISTAKE_CORRECTION" } });
    if (corrected < target) throw new Error("Correct more saved mistakes to unlock this achievement.");
    await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${`flower-chest:${userId}`}))`);
    const previous = await tx.experienceTransaction.findFirst({
      where: { userId, sourceType: { in: ["STREAK_CHEST", "MISTAKE_REVIEW_CHEST", "MISTAKE_ACHIEVEMENT"] }, description: { contains: "flower:" } },
      orderBy: { createdAt: "desc" }, select: { description: true },
    });
    const flower = selectRandomFlowerChest(previous?.description?.match(/flower:([a-z-]+)/u)?.[1] ?? null, randomInt);
    const reward = await grantEconomyReward(tx, {
      userId, experience: Math.min(500, Math.max(10, target * 2)), sourceType: "MISTAKE_ACHIEVEMENT", sourceId: String(target), idempotencyKey,
      description: `Corrected ${target} saved mistakes | flower:${flower.id} | water-lily:1`,
    });
    if (reward.awarded) await tx.userStreak.upsert({ where: { userId }, create: { userId, waterLilyCount: 1 }, update: { waterLilyCount: { increment: 1 } } });
    return { awarded: reward.awarded, experience: reward.experience, waterLily: reward.awarded ? 1 : 0, flowerId: reward.awarded ? flower.id : null };
  });
}
