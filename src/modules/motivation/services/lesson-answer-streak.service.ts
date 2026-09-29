import { randomUUID } from "crypto";
import { Prisma } from "@/generated/prisma-client-payments-runtime";
import { prisma } from "@/core/server/prisma";
import { consumableQuantity, planWaterLilyRestore, WATER_LILY_SHOP_ID, WATER_LILY_TIERS } from "@/modules/motivation/utils/shop-consumables";
import { userLocalDate } from "@/modules/motivation/utils/local-date";
import { experienceForExerciseSpeed } from "@/modules/courses/utils/exercise-speed-reward";
import { correctAnswerStreak } from "@/modules/motivation/utils/correct-answer-streak";
import { rewardRestoredExerciseAnswer } from "@/modules/motivation/services/motivation.service";

async function inventory(tx: Prisma.TransactionClient, userId: string) {
  const [streak, transactions] = await Promise.all([
    tx.userStreak.findUnique({ where: { userId }, select: { waterLilyCount: true } }),
    tx.coinTransaction.findMany({
      where: { userId, sourceId: { in: WATER_LILY_TIERS.map((tier) => tier.id) }, sourceType: { in: ["SHOP_ITEM", "SHOP_ITEM_USE"] } },
      select: { sourceType: true, sourceId: true },
    }),
  ]);
  return WATER_LILY_TIERS.map((tier) => ({
    ...tier,
    quantity: tier.id === WATER_LILY_SHOP_ID ? streak?.waterLilyCount ?? 0 : consumableQuantity(transactions, tier.id),
  }));
}

export async function getLessonAnswerStreak(userId: string, lessonId: string) {
  const [streak, lilies] = await prisma.$transaction(async (tx) => Promise.all([
    tx.lessonAnswerStreak.findUnique({ where: { userId_lessonId: { userId, lessonId } }, select: { current: true, best: true, recoverable: true } }),
    inventory(tx, userId),
  ]));
  return { current: streak?.current ?? 0, best: streak?.best ?? 0, recoverable: streak?.recoverable ?? 0, lilies };
}

/** Continue one verified answer run across the course's next published lesson.
 * The destination is seeded only once, before it has its own answer history.
 * Both rows use the same locks as exercise attempts and Water Lily recovery. */
export async function carryLessonAnswerStreakToNextLesson(userId: string, lessonId: string, nextLessonId: string) {
  if (lessonId === nextLessonId) throw new Error("The next lesson must be different.");
  return prisma.$transaction(async (tx) => {
    for (const id of [lessonId, nextLessonId].sort()) {
      await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${`lesson-answer-streak:${userId}:${id}`}))`);
    }

    const source = await tx.lesson.findUnique({
      where: { id: lessonId },
      select: {
        isPublished: true,
        module: { select: {
          isPublished: true,
          course: { select: {
            isPublished: true,
            modules: { where: { isPublished: true }, orderBy: { order: "asc" }, select: {
              lessons: { where: { isPublished: true }, orderBy: { order: "asc" }, select: { id: true } },
            } },
          } },
        } },
      },
    });
    if (!source?.isPublished || !source.module.isPublished || !source.module.course.isPublished) {
      throw new Error("The completed lesson is no longer published.");
    }
    const orderedLessonIds = source.module.course.modules.flatMap((module) => module.lessons.map((lesson) => lesson.id));
    const sourceIndex = orderedLessonIds.indexOf(lessonId);
    if (sourceIndex < 0 || orderedLessonIds[sourceIndex + 1] !== nextLessonId) {
      throw new Error("The destination is not the next published lesson in this course.");
    }

    const progress = await tx.lessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
      select: { status: true },
    });
    if (progress?.status !== "COMPLETED") throw new Error("Finish the lesson before continuing.");

    const existing = await tx.lessonAnswerStreak.findUnique({
      where: { userId_lessonId: { userId, lessonId: nextLessonId } },
      select: { current: true, best: true, recoverable: true },
    });
    if (existing) return { ...existing, transferred: false };

    const sourceStreak = await tx.lessonAnswerStreak.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
      select: { current: true, best: true },
    });
    if (!sourceStreak?.current) return { current: 0, best: 0, recoverable: 0, transferred: false };

    const carried = await tx.lessonAnswerStreak.create({
      data: { userId, lessonId: nextLessonId, current: sourceStreak.current, best: sourceStreak.best, recoverable: 0 },
      select: { current: true, best: true, recoverable: true },
    });
    return { ...carried, transferred: true };
  });
}

/** A restore and a flower consumption are one server transaction. The
 * serialized inventory prevents two lessons from spending the same lily. */
export async function resolveLessonAnswerStreak(userId: string, lessonId: string, action: "RESTORE" | "CONTINUE") {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${`water-lily-inventory:${userId}`}))`);
    await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${`lesson-answer-streak:${userId}:${lessonId}`}))`);
    const streak = await tx.lessonAnswerStreak.findUnique({ where: { userId_lessonId: { userId, lessonId } } });
    if (!streak?.recoverable) throw new Error("There is no interrupted lesson streak to restore.");
    if (action === "CONTINUE") {
      const updated = await tx.lessonAnswerStreak.update({ where: { id: streak.id }, data: { recoverable: 0 } });
      return { current: updated.current, best: updated.best, recoverable: 0, restored: false };
    }

    const interruptedAttempt = await tx.exerciseAttempt.findFirst({
      where: { userId, lessonId },
      orderBy: [{ createdAt: "desc" }, { attemptNumber: "desc" }],
      select: {
        id: true, exerciseId: true, isCorrect: true, scoreAwarded: true, timeSpentSeconds: true, createdAt: true,
        solutionOpened: true, exercise: { select: { correctAnswer: true, basePoints: true, timeLimitSeconds: true, isGeneratedReview: true } },
      },
    });
    if (!interruptedAttempt || interruptedAttempt.isCorrect) throw new Error("The interrupted answer is no longer available for restoration.");

    const lilies = await inventory(tx, userId);
    const plan = planWaterLilyRestore(lilies, streak.recoverable);
    if (!plan) throw new Error("Not enough Water Lilies are available to restore this answer streak.");
    const basic = plan.lilies.find((entry) => entry.id === WATER_LILY_SHOP_ID);
    if (basic) {
      const spent = await tx.userStreak.updateMany({
        where: { userId, waterLilyCount: { gte: basic.quantity } },
        data: { waterLilyCount: { decrement: basic.quantity } },
      });
      if (spent.count !== 1) throw new Error("These Water Lilies have already been used.");
    }
    const purchased = plan.lilies.filter((entry) => entry.id !== WATER_LILY_SHOP_ID);
    if (purchased.length) {
      const wallet = await tx.userWallet.upsert({ where: { userId }, create: { userId }, update: {} });
      const balanceMinor = wallet.balance * 100 + wallet.fractionalBalance;
      for (const lily of purchased) for (let index = 0; index < lily.quantity; index += 1) {
        await tx.coinTransaction.create({ data: {
          userId, walletId: wallet.id, amount: 0, amountMinor: 0,
          balanceBefore: wallet.balance, balanceAfter: wallet.balance,
          balanceBeforeMinor: balanceMinor, balanceAfterMinor: balanceMinor,
          type: "PURCHASE", sourceType: "SHOP_ITEM_USE", sourceId: lily.id,
          idempotencyKey: `lesson-water-lily:${userId}:${lessonId}:${randomUUID()}`,
          localDate: userLocalDate("UTC"), description: `Restored lesson answer streak with ${lily.id}`,
        } });
      }
    }
    const current = streak.recoverable + 1;
    const best = Math.max(streak.best, current);
    const updated = await tx.lessonAnswerStreak.update({ where: { id: streak.id }, data: { current, best, recoverable: 0 } });
    const correctedScore = interruptedAttempt.solutionOpened
      ? Math.floor(interruptedAttempt.exercise.basePoints / 2)
      : interruptedAttempt.exercise.basePoints;
    const scoreAdjustment = correctedScore - interruptedAttempt.scoreAwarded;
    await tx.exerciseAttempt.update({ where: { id: interruptedAttempt.id }, data: {
      isCorrect: true,
      submittedAnswer: interruptedAttempt.exercise.correctAnswer === null ? Prisma.JsonNull : interruptedAttempt.exercise.correctAnswer as Prisma.InputJsonValue,
      scoreAwarded: correctedScore,
    } });
    await tx.lessonProgress.updateMany({ where: { userId, lessonId, incorrectAnswers: { gt: 0 } }, data: {
      score: { increment: scoreAdjustment }, correctAnswers: { increment: 1 }, incorrectAnswers: { decrement: 1 },
    } });
    const user = await tx.user.findUnique({ where: { id: userId }, select: { timeZone: true } });
    const attemptDate = userLocalDate(user?.timeZone, interruptedAttempt.createdAt);
    await tx.userDailyActivity.updateMany({ where: { userId, date: attemptDate, incorrectAnswers: { gt: 0 } }, data: {
      correctAnswers: { increment: 1 }, incorrectAnswers: { decrement: 1 },
    } });
    const incorrectActivity = await tx.learningActivity.findFirst({
      where: { userId, lessonId, exerciseId: interruptedAttempt.exerciseId, type: "EXERCISE_INCORRECT" },
      orderBy: { occurredAt: "desc" }, select: { id: true },
    });
    if (incorrectActivity) await tx.learningActivity.update({ where: { id: incorrectActivity.id }, data: { type: "EXERCISE_CORRECT", score: correctedScore } });
    await tx.userMistake.updateMany({ where: { userId, exerciseId: interruptedAttempt.exerciseId, resolvedAt: null }, data: {
      resolvedAt: new Date(), resolutionCount: { increment: 1 },
    } });
    const reward = await rewardRestoredExerciseAnswer(tx, {
      userId, date: attemptDate, exerciseId: interruptedAttempt.exerciseId, currentStreak: current,
      speedExperience: experienceForExerciseSpeed(interruptedAttempt.timeSpentSeconds ?? Number.POSITIVE_INFINITY, interruptedAttempt.exercise.timeLimitSeconds),
      isSpacedReview: interruptedAttempt.exercise.isGeneratedReview,
    });
    const level = await tx.userLevel.upsert({ where: { userId }, create: { userId }, update: {} });
    await tx.userLevel.update({ where: { id: level.id }, data: { currentCorrectStreak: current, bestCorrectStreak: Math.max(level.bestCorrectStreak, best) } });
    const streakReward = correctAnswerStreak(current);
    return { current: updated.current, best: updated.best, recoverable: 0, restored: true, lilyCapacity: plan.totalCapacity, liliesUsed: plan.lilies,
      exerciseId: interruptedAttempt.exerciseId, correctAnswer: interruptedAttempt.exercise.correctAnswer,
      experience: reward.experience, streakMilestone: streakReward.activated ? streakReward.modeStart : null,
    };
  });
}
