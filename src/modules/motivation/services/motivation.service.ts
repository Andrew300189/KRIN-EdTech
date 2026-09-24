import { randomUUID } from "crypto";
import { Prisma } from "@/generated/prisma-client-payments-runtime";
import { prisma } from "@/core/server/prisma";
import { excludeSystemAccounts } from "@/core/server/system-accounts";
import { MOTIVATION_CONFIG } from "@/modules/motivation/constants/motivation-config";
import { achievementSchema, adminRewardAdjustmentSchema, createLearningSessionSchema, heartbeatSchema, motivationSettingsSchema, rewardRuleSchema } from "@/modules/motivation/schemas/motivation.schemas";
import { dateDistanceInDays, localWeekStart, safeTimeZone, subtractLocalDays, userLocalDate, userLocalHour } from "@/modules/motivation/utils/local-date";
import { determineHeartbeatCredit } from "@/modules/motivation/utils/heartbeat-policy";
import { correctAnswerStreak } from "@/modules/motivation/utils/correct-answer-streak";
import { baseExperienceForExercise } from "@/modules/courses/utils/exercise-speed-reward";
import { grantLearningBonusCredits } from "@/modules/motivation/services/learning-bonus.service";

type Tx = Prisma.TransactionClient;
type RewardEvent = "EXERCISE_CORRECT" | "LESSON_COMPLETED" | "HOMEWORK_COMPLETED" | "VOCABULARY_REVIEW" | "VOCABULARY_SESSION_COMPLETED" | "WARM_UP_COMPLETED" | "DAILY_GOAL" | "COURSE_COMPLETED";
type ExperienceType = "LESSON_COMPLETED" | "EXERCISE_CORRECT" | "HOMEWORK_COMPLETED" | "VOCABULARY_REVIEW" | "VOCABULARY_SESSION_COMPLETED" | "WARM_UP_COMPLETED" | "DAILY_GOAL" | "COURSE_COMPLETED" | "PLACEMENT_TEST_COMPLETED" | "ACHIEVEMENT_REWARD" | "ADMIN_ADJUSTMENT" | "XP_EXCHANGE" | "REVERSAL";
type CoinType = "LESSON_REWARD" | "DAILY_GOAL_REWARD" | "STREAK_REWARD" | "ACHIEVEMENT_REWARD" | "COURSE_REWARD" | "PURCHASE" | "REFUND" | "ADMIN_ADJUSTMENT" | "XP_EXCHANGE" | "REVERSAL";

const eventExperienceType: Record<RewardEvent, ExperienceType> = {
  EXERCISE_CORRECT: "EXERCISE_CORRECT", LESSON_COMPLETED: "LESSON_COMPLETED", HOMEWORK_COMPLETED: "HOMEWORK_COMPLETED", VOCABULARY_REVIEW: "VOCABULARY_REVIEW", VOCABULARY_SESSION_COMPLETED: "VOCABULARY_SESSION_COMPLETED", WARM_UP_COMPLETED: "WARM_UP_COMPLETED", DAILY_GOAL: "DAILY_GOAL", COURSE_COMPLETED: "COURSE_COMPLETED",
};
const eventCoinType: Record<RewardEvent, CoinType> = {
  EXERCISE_CORRECT: "LESSON_REWARD", LESSON_COMPLETED: "LESSON_REWARD", HOMEWORK_COMPLETED: "LESSON_REWARD", VOCABULARY_REVIEW: "LESSON_REWARD", VOCABULARY_SESSION_COMPLETED: "LESSON_REWARD", WARM_UP_COMPLETED: "LESSON_REWARD", DAILY_GOAL: "DAILY_GOAL_REWARD", COURSE_COMPLETED: "COURSE_REWARD",
};

const specialBadgeCodes = new Set(["NIGHT_WATCH", "UNBEATABLE_PLACEMENT"]);

const specialBadgeDefinition = {
  NIGHT_WATCH: {
    title: "Night Watch",
    description: "Completed a lesson between 03:00 and 03:59 local time.",
    icon: "🌙",
    category: "TIME" as const,
    rarity: "EPIC" as const,
    order: 910,
  },
  UNBEATABLE_PLACEMENT: {
    title: "Unbeatable",
    description: "Completed the 100-question placement test with no mistakes.",
    icon: "🛡️",
    category: "ACCURACY" as const,
    rarity: "LEGENDARY" as const,
    order: 920,
  },
} as const;

/** The diagnostic is a one-time milestone, rather than 100 separate rewards. */
export const PLACEMENT_TEST_COMPLETION_XP = 25;

const json = (value: unknown) => value as Prisma.InputJsonValue;

export function calculateUserLevel(lifetimeExperience: number) {
  let level = 1;
  while (25 * (level + 1 - 1) * (level + 1 + 2) <= lifetimeExperience) level += 1;
  const levelStart = 25 * (level - 1) * (level + 2);
  const nextStart = 25 * level * (level + 3);
  return { level, currentExperience: Math.max(0, lifetimeExperience - levelStart), lifetimeExperience, experienceToNextLevel: Math.max(0, nextStart - lifetimeExperience) };
}

async function userContext(tx: Tx, userId: string) {
  const user = await tx.user.findUnique({ where: { id: userId }, select: { id: true, timeZone: true, dailyGoalMinutes: true } });
  if (!user) throw new Error("User not found");
  return { ...user, timeZone: safeTimeZone(user.timeZone), date: userLocalDate(user.timeZone) };
}

async function ensureDailyActivity(tx: Tx, userId: string, date: string) {
  return tx.userDailyActivity.upsert({ where: { userId_date: { userId, date } }, create: { userId, date }, update: {} });
}

async function logSuspicious(tx: Tx, userId: string, type: "HEARTBEAT_FUTURE_TIMESTAMP" | "HEARTBEAT_REPLAY" | "HEARTBEAT_EXCESSIVE_GAP" | "CONCURRENT_SESSIONS" | "EXCESSIVE_DAILY_XP" | "EXCESSIVE_VOCABULARY_REVIEWS" | "REWARD_REPLAY", metadata: Record<string, unknown>, severity: "LOW" | "MEDIUM" | "HIGH" = "LOW") {
  await tx.suspiciousActivity.create({ data: { userId, type, severity, metadata: json(metadata) } });
}

async function updateUserLevel(tx: Tx, userId: string, amount: number) {
  const current = await tx.userLevel.upsert({ where: { userId }, create: { userId }, update: {} });
  const next = calculateUserLevel(Math.max(0, current.lifetimeExperience + amount));
  // `lifetimeExperience` is the spendable XP balance kept for the level and
  // exchange economy. The permanent leaderboard counter is changed only by
  // the database trigger on a positive ExperienceTransaction ledger entry.
  // This prevents a browser request or later XP/coin exchange from changing
  // rank independently of a verified server reward.
  const updated = await tx.userLevel.update({ where: { userId }, data: { ...next } });
  return { ...updated, levelUp: next.level > current.level };
}

async function creditCoins(tx: Tx, userId: string, amount: number, type: CoinType, sourceType: string, sourceId: string, idempotencyKey: string, localDate: string, description?: string) {
  if (!amount) return { amount: 0, balance: (await tx.userWallet.upsert({ where: { userId }, create: { userId }, update: {} })).balance };
  const existing = await tx.coinTransaction.findUnique({ where: { idempotencyKey }, select: { amount: true, balanceAfter: true } });
  if (existing) return { amount: 0, balance: existing.balanceAfter };
  const wallet = await tx.userWallet.upsert({ where: { userId }, create: { userId }, update: {} });
  if (wallet.balance + amount < 0) throw new Error("Insufficient coin balance");
  const balanceAfter = wallet.balance + amount;
  await tx.userWallet.update({ where: { id: wallet.id }, data: { balance: balanceAfter, lifetimeEarned: { increment: Math.max(0, amount) }, lifetimeSpent: { increment: Math.max(0, -amount) } } });
  await tx.coinTransaction.create({ data: { userId, walletId: wallet.id, amount, balanceBefore: wallet.balance, balanceAfter, type, sourceType, sourceId, idempotencyKey, localDate, description } });
  return { amount, balance: balanceAfter };
}

/** Flower rewards may include a fractional KRIN Coin. Coin ledger entries
 * never change the permanent XP leaderboard counter. */
async function creditKrinCoinMinor(tx: Tx, input: { userId: string; minor: number; sourceType: string; sourceId: string; idempotencyKey: string; localDate: string; description: string }) {
  if (!input.minor) return 0;
  const wallet = await tx.userWallet.upsert({ where: { userId: input.userId }, create: { userId: input.userId }, update: {} });
  await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "UserWallet" WHERE "id" = ${wallet.id} FOR UPDATE`);
  const lockedWallet = await tx.userWallet.findUniqueOrThrow({ where: { id: wallet.id } });
  const beforeMinor = lockedWallet.balance * 100 + lockedWallet.fractionalBalance;
  const afterMinor = beforeMinor + input.minor;
  const updated = await tx.userWallet.update({ where: { id: wallet.id }, data: {
    balance: Math.floor(afterMinor / 100), fractionalBalance: afterMinor % 100,
    lifetimeEarned: { increment: Math.floor(afterMinor / 100) - lockedWallet.balance },
  } });
  await tx.coinTransaction.create({ data: {
    userId: input.userId, walletId: wallet.id, amount: Math.floor(input.minor / 100), amountMinor: input.minor,
    balanceBefore: lockedWallet.balance, balanceAfter: updated.balance,
    balanceBeforeMinor: beforeMinor, balanceAfterMinor: afterMinor,
    type: "STREAK_REWARD", sourceType: input.sourceType, sourceId: input.sourceId,
    idempotencyKey: `fractional-krin:${input.idempotencyKey}`, localDate: input.localDate, description: input.description,
  } });
  return input.minor / 100;
}

async function creditExperienceAndCoins(tx: Tx, options: { userId: string; experienceAmount: number; coinAmount: number; experienceType: ExperienceType; coinType: CoinType; sourceType: string; sourceId: string; idempotencyKey: string; description?: string; date: string }) {
  const existing = await tx.experienceTransaction.findUnique({ where: { idempotencyKey: options.idempotencyKey }, select: { id: true } });
  if (existing) return { awarded: false, experience: 0, coins: 0, levelUp: false };
  const level = await updateUserLevel(tx, options.userId, options.experienceAmount);
  await tx.experienceTransaction.create({ data: { userId: options.userId, amount: options.experienceAmount, type: options.experienceType, sourceType: options.sourceType, sourceId: options.sourceId, idempotencyKey: options.idempotencyKey, localDate: options.date, description: options.description } });
  const coins = await creditCoins(tx, options.userId, options.coinAmount, options.coinType, options.sourceType, options.sourceId, options.idempotencyKey, options.date, options.description);
  await ensureDailyActivity(tx, options.userId, options.date);
  await tx.userDailyActivity.update({ where: { userId_date: { userId: options.userId, date: options.date } }, data: { experienceEarned: { increment: options.experienceAmount }, coinsEarned: { increment: Math.max(0, coins.amount) } } });
  return { awarded: true, experience: options.experienceAmount, coins: coins.amount, levelUp: level.levelUp, level: level.level };
}

/**
 * A small, deliberately constrained bridge for server-owned reward features
 * such as the Daily Chest and lesson wheel.  UI code never receives access to
 * the level or wallet tables: it can only call a protected API route which in
 * turn chooses one of these fixed rewards on the server.
 */
export async function grantEconomyReward(
  tx: Tx,
  input: { userId: string; experience: number; krinCoinMinor?: number; krinCoins?: number; hintCredits?: number; translationCredits?: number; sourceType: string; sourceId: string; idempotencyKey: string; description: string },
) {
  const context = await userContext(tx, input.userId);
  const krinCoinMinor = Math.max(0, Math.trunc(input.krinCoinMinor ?? 0));
  const krinCoins = Math.max(0, Math.trunc(input.krinCoins ?? 0));
  const description = krinCoinMinor ? `${input.description} | krin-coin-minor:${krinCoinMinor}` : input.description;
  const reward = await creditExperienceAndCoins(tx, {
    userId: input.userId,
    experienceAmount: input.experience,
    // The only automatic KRIN Coin is the server-verified 100-answer streak
    // chest. It is spendable currency and is intentionally not ranked.
    coinAmount: krinCoins,
    experienceType: "ACHIEVEMENT_REWARD",
    coinType: input.sourceType === "STREAK_CHEST" ? "STREAK_REWARD" : "ACHIEVEMENT_REWARD",
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    idempotencyKey: input.idempotencyKey,
    description,
    date: context.date,
  });
  if (!reward.awarded) return { ...reward, hintCredits: 0, translationCredits: 0, bonusBalance: null };
  const fractionalCoins = await creditKrinCoinMinor(tx, {
    userId: input.userId, minor: krinCoinMinor, sourceType: input.sourceType, sourceId: input.sourceId,
    idempotencyKey: input.idempotencyKey, localDate: context.date, description,
  });
  const bonus = await grantLearningBonusCredits(tx, {
    userId: input.userId,
    hintCredits: input.hintCredits ?? 0,
    translationCredits: input.translationCredits ?? 0,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    idempotencyKey: input.idempotencyKey,
    description,
  });
  // Economy rewards can be the event that completes an active quest (for
  // example, spinning a lesson wheel). Evaluate after its immutable ledger
  // entries have been recorded, so a retry can never grant a second reward.
  const achievements = await evaluateAchievements(tx, input.userId, context.date);
  return { ...reward, coins: reward.coins + fractionalCoins, hintCredits: bonus.hintCredits, translationCredits: bonus.translationCredits, bonusBalance: bonus.balance, achievements };
}

async function rewardForEvent(tx: Tx, userId: string, date: string, eventType: RewardEvent, sourceId: string, description: string) {
  const idempotencyKey = `${eventType.toLowerCase()}:${userId}:${sourceId}`;
  const existing = await tx.experienceTransaction.findUnique({ where: { idempotencyKey }, select: { id: true } });
  if (existing) return { awarded: false, experience: 0, coins: 0, levelUp: false };
  const rule = await tx.rewardRule.findUnique({ where: { eventType } });
  if (!rule?.isActive) return { awarded: false, experience: 0, coins: 0, levelUp: false };
  if (rule.dailyLimit) {
    const claims = await tx.experienceTransaction.count({ where: { userId, type: eventExperienceType[eventType], localDate: date } });
    if (claims >= rule.dailyLimit) return { awarded: false, experience: 0, coins: 0, levelUp: false };
  }
  if (rule.weeklyLimit) {
    const claims = await tx.experienceTransaction.count({ where: { userId, type: eventExperienceType[eventType], localDate: { gte: subtractLocalDays(date, 6), lte: date } } });
    if (claims >= rule.weeklyLimit) return { awarded: false, experience: 0, coins: 0, levelUp: false };
  }
  return creditExperienceAndCoins(tx, { userId, experienceAmount: rule.experienceAmount, coinAmount: 0, experienceType: eventExperienceType[eventType], coinType: eventCoinType[eventType], sourceType: eventType, sourceId, idempotencyKey, description, date });
}

/**
 * Every exercise can reward a learner exactly once: on their first correct
 * answer.  The idempotency key is the protection against replays, rather than
 * a daily cap that could silently stop XP partway through a long lesson.
 */
async function rewardFirstCorrectExercise(tx: Tx, userId: string, date: string, exerciseId: string, streakBonus = 0, speedExperience?: number) {
  const idempotencyKey = `exercise_correct:${userId}:${exerciseId}`;
  const existing = await tx.experienceTransaction.findUnique({ where: { idempotencyKey }, select: { id: true } });
  if (existing) return { awarded: false, experience: 0, coins: 0, levelUp: false };

  const rule = await tx.rewardRule.findUnique({ where: { eventType: "EXERCISE_CORRECT" } });
  if (!rule?.isActive) return { awarded: false, experience: 0, coins: 0, levelUp: false };

  // Every engine starts at 1 XP. A verified server timer may raise that
  // exercise reward to 2–3 XP; authoring difficulty is never an XP shortcut.
  const baseExperience = baseExperienceForExercise(speedExperience);
  const experienceAmount = baseExperience + streakBonus;
  const reward = await creditExperienceAndCoins(tx, {
    userId,
    experienceAmount,
    coinAmount: 0,
    experienceType: "EXERCISE_CORRECT",
    coinType: "LESSON_REWARD",
    sourceType: "EXERCISE_CORRECT",
    sourceId: exerciseId,
    idempotencyKey,
    description: streakBonus
      ? `First correct exercise attempt (+${baseExperience} XP + ${streakBonus} XP streak bonus)`
      : `First correct exercise attempt (+${baseExperience} XP)`,
    date,
  });
  return { ...reward, baseExperience, streakBonus };
}

/** Spaced retrieval preserves its legacy 1.5 XP reward when no speed window
 * is available. Timed cards use the same server-validated 1–3 XP band as
 * every other exercise; fractional hundredths remain supported in the ledger. */
async function rewardSpacedReviewAnswer(tx: Tx, userId: string, date: string, exerciseId: string, streakBonus = 0, speedExperience?: number) {
  const idempotencyKey = `exercise_correct:${userId}:${exerciseId}`;
  const existing = await tx.experienceTransaction.findUnique({ where: { idempotencyKey }, select: { id: true } });
  if (existing) return { awarded: false, experience: 0, coins: 0, levelUp: false };
  const rule = await tx.rewardRule.findUnique({ where: { eventType: "EXERCISE_CORRECT" } });
  if (!rule?.isActive) return { awarded: false, experience: 0, coins: 0, levelUp: false };

  const baseExperience = baseExperienceForExercise(speedExperience);
  const amountMinor = Math.round(baseExperience * 100) + (streakBonus * 100);
  const current = await tx.userLevel.upsert({ where: { userId }, create: { userId }, update: {} });
  const nextMinorTotal = (current.lifetimeExperience * 100) + current.fractionalExperience + amountMinor;
  const nextExperience = Math.floor(nextMinorTotal / 100);
  const fractionalExperience = nextMinorTotal % 100;
  const levelData = calculateUserLevel(nextExperience);
  const updated = await tx.userLevel.update({
    where: { id: current.id },
    // The exact 1.5 XP ledger entry below is what the database trigger uses
    // to increase the permanent rank score.
    data: { ...levelData, fractionalExperience },
  });
  await tx.experienceTransaction.create({
    data: {
      userId,
      amount: Math.floor(amountMinor / 100),
      amountMinor,
      type: "EXERCISE_CORRECT",
      sourceType: "SPACED_REVIEW",
      sourceId: exerciseId,
      idempotencyKey,
      localDate: date,
      description: streakBonus
        ? `Correct spaced review question (+${baseExperience} XP + ${streakBonus} XP streak bonus)`
      : `Correct spaced review question (+${baseExperience} XP)`,
    },
  });
  await tx.userDailyActivity.update({
    where: { userId_date: { userId, date } },
    data: {
      experienceEarned: { increment: Math.floor(amountMinor / 100) },
      experienceEarnedMinor: { increment: amountMinor },
    },
  });
  return { awarded: true, experience: amountMinor / 100, coins: 0, levelUp: updated.level > current.level, level: updated.level, baseExperience, streakBonus };
}

async function updateStreakForDate(tx: Tx, userId: string, date: string) {
  const streak = await tx.userStreak.upsert({ where: { userId }, create: { userId }, update: {} });
  if (streak.lastQualifiedDate === date) return streak;
  const previous = streak.currentStreak;
  let currentStreak = 1;
  let freezeCount = streak.freezeCount;
  let recoverableStreak = streak.recoverableStreak;
  let streakLostAt = streak.streakLostAt;
  let type: "STARTED" | "CONTINUED" | "RESET" | "FREEZE_USED" = streak.lastQualifiedDate ? "RESET" : "STARTED";
  if (streak.lastQualifiedDate) {
    const gap = dateDistanceInDays(streak.lastQualifiedDate, date);
    if (gap === 1) { currentStreak = streak.currentStreak + 1; type = "CONTINUED"; }
    else if (gap === 2 && streak.freezeCount > 0) { currentStreak = streak.currentStreak + 1; freezeCount -= 1; type = "FREEZE_USED"; }
    else if (previous > 0) {
      // Keep the just-lost run as a single server-owned recovery candidate.
      // A newer lapse replaces an older one; a client cannot choose a larger
      // historic value when it asks to restore a streak.
      recoverableStreak = previous;
      streakLostAt = new Date();
    }
  }
  const updated = await tx.userStreak.update({ where: { userId }, data: { currentStreak, longestStreak: Math.max(streak.longestStreak, currentStreak), lastQualifiedDate: date, freezeCount, recoverableStreak, streakLostAt, streakStartedAt: currentStreak === 1 ? new Date() : streak.streakStartedAt } });
  await tx.streakEvent.create({ data: { userId, type, date, previousStreak: previous, nextStreak: currentStreak, metadata: type === "FREEZE_USED" ? json({ remainingFreezes: freezeCount }) : undefined } });
  return updated;
}

const coreQuestDefinitions = [
  {
    code: "ANSWER_STREAK_10",
    title: "Стрик ×10",
    description: "Дайте 10 правильних відповідей поспіль з першої спроби.",
    icon: "🔥",
    category: "STREAK" as const,
    rarity: "RARE" as const,
    conditionType: "CORRECT_ANSWER_STREAK" as const,
    conditionConfig: json({ target: 10, absolute: true }),
    experienceReward: 40,
    coinReward: 0,
    unlockShopItemId: null,
    isTrophy: false,
    isHidden: false,
    isActive: true,
    order: 110,
  },
  {
    code: "WHEEL_AURORA_UNLOCK",
    title: "Відкрийте Aurora",
    description: "Завершіть урок і прокрутіть бонусне колесо, щоб відкрити тему Aurora.",
    icon: "🎡",
    category: "LEARNING" as const,
    rarity: "EPIC" as const,
    conditionType: "WHEELS_SPUN" as const,
    conditionConfig: json({ target: 1 }),
    experienceReward: 30,
    coinReward: 0,
    unlockShopItemId: "theme-aurora",
    isTrophy: false,
    isHidden: false,
    isActive: true,
    order: 120,
  },
] as const;

/** Keep the starter quests available in both existing and new installations. */
async function ensureCoreQuestDefinitions(tx: Tx) {
  await Promise.all(coreQuestDefinitions.map((quest) => tx.achievement.upsert({
    where: { code: quest.code },
    create: quest,
    // Keep platform-owner changes intact after the initial definition has
    // been created. This guard only fills an absent core quest.
    update: {},
  })));
}

async function achievementMetric(tx: Tx, userId: string, conditionType: string, streakValue: number, lifetimeExperience: number, correctAnswerStreakValue: number) {
  if (conditionType === "LESSONS_COMPLETED") return tx.lessonProgress.count({ where: { userId, status: "COMPLETED" } });
  if (conditionType === "EXERCISES_CORRECT") return tx.exerciseAttempt.count({ where: { userId, isCorrect: true } });
  if (conditionType === "VOCABULARY_REVIEWS") return tx.wordReviewAttempt.count({ where: { userId } });
  if (conditionType === "STREAK_DAYS") return streakValue;
  if (conditionType === "CORRECT_ANSWER_STREAK") return correctAnswerStreakValue;
  if (conditionType === "WHEELS_SPUN") return tx.experienceTransaction.count({ where: { userId, sourceType: "LESSON_WHEEL" } });
  if (conditionType === "ACTIVE_MINUTES") { const total = await tx.userDailyActivity.aggregate({ where: { userId }, _sum: { activeSeconds: true } }); return Math.floor((total._sum.activeSeconds ?? 0) / 60); }
  if (conditionType === "EXPERIENCE_EARNED") return lifetimeExperience;
  if (conditionType === "PERFECT_LESSONS") return tx.lessonProgress.count({ where: { userId, status: "COMPLETED", grade: 5, incorrectAnswers: 0 } });
  if (conditionType === "COURSES_COMPLETED") return tx.learningActivity.count({ where: { userId, type: "COURSE_COMPLETED" } });
  if (conditionType === "MISTAKES_RESOLVED") return tx.userMistake.count({ where: { userId, resolvedAt: { not: null } } });
  if (conditionType === "MISTAKE_REVIEW_RUNS_COMPLETED") return tx.mistakeReviewRun.count({ where: { userId, status: "COMPLETED" } });
  return 0;
}

async function evaluateAchievements(tx: Tx, userId: string, date: string) {
  await ensureCoreQuestDefinitions(tx);
  const [achievements, level, streak, activatedQuests] = await Promise.all([
    tx.achievement.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }),
    tx.userLevel.upsert({ where: { userId }, create: { userId }, update: {} }),
    tx.userStreak.upsert({ where: { userId }, create: { userId }, update: {} }),
    tx.userAchievement.findMany({ where: { userId, activatedAt: { not: null } } }),
  ]);
  const activatedByAchievementId = new Map(activatedQuests.map((quest) => [quest.achievementId, quest]));
  const unlocked: Array<{ title: string; experience: number; coins: number; unlockShopItemId: string | null }> = [];
  for (const achievement of achievements) {
    // These hidden, event-specific badges are verified at their precise
    // source event below. A generic aggregate would make them unlock under
    // the wrong conditions.
    if (specialBadgeCodes.has(achievement.code)) continue;
    const existing = activatedByAchievementId.get(achievement.id);
    // Learners choose which quests to pursue. Do not silently create a quest
    // record or award it before they have activated it themselves.
    if (!existing) continue;
    const config = (achievement.conditionConfig ?? {}) as { target?: unknown; absolute?: unknown };
    const target = Math.max(1, Number(config.target ?? 1));
    const metric = await achievementMetric(tx, userId, achievement.conditionType, streak.currentStreak, level.lifetimeExperience, level.currentCorrectStreak);
    // A correct-answer streak is a live, consecutive sequence. It must not be
    // reduced to "answers since activation", which would let errors pass.
    const progress = config.absolute === true ? metric : Math.max(0, metric - existing.baseline);
    const completed = progress >= target;
    const userAchievement = await tx.userAchievement.update({ where: { id: existing.id }, data: { progress, target, ...(completed && !existing.completed ? { completed: true, completedAt: new Date() } : {}) } });
    if (completed && !existing.completed && userAchievement.completed) {
      const reward = await creditExperienceAndCoins(tx, { userId, experienceAmount: achievement.experienceReward, coinAmount: 0, experienceType: "ACHIEVEMENT_REWARD", coinType: "ACHIEVEMENT_REWARD", sourceType: "ACHIEVEMENT", sourceId: achievement.id, idempotencyKey: `achievement:${userId}:${achievement.id}`, description: `Quest completed: ${achievement.title}`, date });
      if (achievement.unlockShopItemId) {
        await unlockAchievementShopItem(tx, userId, achievement.unlockShopItemId, achievement.id, date, achievement.title);
      }
      unlocked.push({ title: achievement.title, experience: reward.experience, coins: reward.coins, unlockShopItemId: achievement.unlockShopItemId });
    }
  }
  return unlocked;
}

/** A quest unlock is durable ownership, never a balance-changing coin award. */
async function unlockAchievementShopItem(tx: Tx, userId: string, itemId: string, achievementId: string, date: string, title: string) {
  const idempotencyKey = `achievement-unlock:${userId}:${achievementId}:${itemId}`;
  const existing = await tx.coinTransaction.findUnique({ where: { idempotencyKey }, select: { id: true } });
  if (existing) return false;
  const wallet = await tx.userWallet.upsert({ where: { userId }, create: { userId }, update: {} });
  await tx.coinTransaction.create({
    data: {
      userId,
      walletId: wallet.id,
      amount: 0,
      amountMinor: 0,
      balanceBefore: wallet.balance,
      balanceAfter: wallet.balance,
      balanceBeforeMinor: wallet.balance * 100 + wallet.fractionalBalance,
      balanceAfterMinor: wallet.balance * 100 + wallet.fractionalBalance,
      type: "ACHIEVEMENT_REWARD",
      sourceType: "ACHIEVEMENT_UNLOCK",
      sourceId: itemId,
      idempotencyKey,
      localDate: date,
      description: `Quest unlock: ${title}`,
    },
  });
  return true;
}

async function awardSpecialBadge(tx: Tx, userId: string, code: keyof typeof specialBadgeDefinition) {
  const definition = specialBadgeDefinition[code];
  const achievement = await tx.achievement.upsert({
    where: { code },
    create: {
      code,
      title: definition.title,
      description: definition.description,
      icon: definition.icon,
      category: definition.category,
      rarity: definition.rarity,
      // The type is retained for the existing schema; evaluation is guarded
      // above and this badge can only be earned at its source event.
      conditionType: "ACTIVE_MINUTES",
      conditionConfig: json({ target: 1, source: code }),
      isTrophy: true,
      isHidden: true,
      order: definition.order,
    },
    update: {},
  });
  const existing = await tx.userAchievement.findUnique({ where: { userId_achievementId: { userId, achievementId: achievement.id } }, select: { completed: true } });
  if (existing?.completed) return null;
  await tx.userAchievement.upsert({
    where: { userId_achievementId: { userId, achievementId: achievement.id } },
    create: { userId, achievementId: achievement.id, progress: 1, target: 1, activatedAt: new Date(), completed: true, completedAt: new Date() },
    update: { progress: 1, target: 1, activatedAt: new Date(), completed: true, completedAt: new Date() },
  });
  return { title: achievement.title, icon: achievement.icon };
}

/** Called only after a server-validated, complete 100-question placement test. */
export async function recordPerfectPlacementTestBadge(tx: Tx, userId: string, answers: readonly boolean[]) {
  if (answers.length !== 100 || !answers.every(Boolean)) return null;
  return awardSpecialBadge(tx, userId, "UNBEATABLE_PLACEMENT");
}

async function checkDailyGoalCompletionInTransaction(tx: Tx, userId: string, date: string) {
  const [user, daily] = await Promise.all([userContext(tx, userId), ensureDailyActivity(tx, userId, date)]);
  if (daily.dailyGoalCompleted || daily.activeSeconds < user.dailyGoalMinutes * 60) return { completed: false, streak: null, rewards: null };
  await tx.userDailyActivity.update({ where: { userId_date: { userId, date } }, data: { dailyGoalCompleted: true } });
  await tx.learningActivity.create({ data: { userId, type: "DAILY_GOAL_COMPLETED", metadata: json({ date, goalMinutes: user.dailyGoalMinutes }) } });
  const reward = await rewardForEvent(tx, userId, date, "DAILY_GOAL", date, "Daily learning goal completed");
  const streak = await updateStreakForDate(tx, userId, date);
  await evaluateAchievements(tx, userId, date);
  return { completed: true, streak, rewards: reward };
}

export async function createLearningSession(userId: string, input: unknown) {
  const value = createLearningSessionSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    let courseId: string | undefined;
    if (value.lessonId) {
      const lesson = await tx.lesson.findUnique({ where: { id: value.lessonId }, select: { module: { select: { courseId: true } } } });
      if (!lesson) throw new Error("Lesson not found");
      courseId = lesson.module.courseId;
    }
    const existing = await tx.learningSession.findFirst({ where: { userId, type: value.type, lessonId: value.lessonId ?? null, status: "ACTIVE" }, orderBy: { startedAt: "desc" } });
    if (existing) return existing;
    const duplicates = await tx.learningSession.findMany({ where: { userId, type: value.type, lessonId: value.lessonId ?? null, status: "ACTIVE" }, select: { id: true } });
    if (duplicates.length > 1) await logSuspicious(tx, userId, "CONCURRENT_SESSIONS", { type: value.type, lessonId: value.lessonId, count: duplicates.length }, "MEDIUM");
    const session = await tx.learningSession.create({ data: { userId, courseId, lessonId: value.lessonId, type: value.type } });
    const context = await userContext(tx, userId);
    await ensureDailyActivity(tx, userId, context.date);
    if (value.type === "LESSON") await tx.userDailyActivity.update({ where: { userId_date: { userId, date: context.date } }, data: { lessonsStarted: { increment: 1 } } });
    await tx.learningActivity.create({ data: { userId, type: "LESSON_OPENED", courseId, lessonId: value.lessonId, metadata: json({ sessionId: session.id, sessionType: value.type }) } });
    return session;
  });
}

export async function recordLearningHeartbeat(userId: string, sessionId: string, input: unknown) {
  const value = heartbeatSchema.parse(input);
  const clientTimestamp = new Date(value.clientTimestamp);
  return prisma.$transaction(async (tx) => {
    const session = await tx.learningSession.findFirst({ where: { id: sessionId, userId } });
    if (!session) throw new Error("Learning session not found");
    const now = new Date();
    const context = await userContext(tx, userId);
    const futureSeconds = (clientTimestamp.getTime() - now.getTime()) / 1000;
    if (futureSeconds > MOTIVATION_CONFIG.heartbeat.futureToleranceSeconds) {
      await logSuspicious(tx, userId, "HEARTBEAT_FUTURE_TIMESTAMP", { sessionId, clientTimestamp: value.clientTimestamp, futureSeconds }, "MEDIUM");
      return { session, creditedSeconds: 0, reason: "future_timestamp", dailyGoal: await checkDailyGoalCompletionInTransaction(tx, userId, context.date) };
    }
    if (session.status !== "ACTIVE") return { session, creditedSeconds: 0, reason: "inactive_session", dailyGoal: null };
    if (session.lastClientTimestamp && clientTimestamp <= session.lastClientTimestamp) {
      await logSuspicious(tx, userId, "HEARTBEAT_REPLAY", { sessionId, clientTimestamp: value.clientTimestamp }, "LOW");
      return { session, creditedSeconds: 0, reason: "replayed_heartbeat", dailyGoal: null };
    }
    const elapsedSeconds = Math.max(0, Math.floor((now.getTime() - session.lastHeartbeatAt.getTime()) / 1000));
    const hasInteraction = value.interactionCount > session.lastInteractionCount;
    const daily = await ensureDailyActivity(tx, userId, context.date);
    const policy = determineHeartbeatCredit({ elapsedSeconds, activeSessionSeconds: session.activeSeconds, dailyActiveSeconds: daily.activeSeconds, interactionAdvanced: hasInteraction, clientTimestampFutureSeconds: futureSeconds, replayed: false });
    let creditedSeconds = policy.creditedSeconds;
    const status = policy.status;
    if (policy.reason === "excessive_gap") {
      await logSuspicious(tx, userId, "HEARTBEAT_EXCESSIVE_GAP", { sessionId, elapsedSeconds }, "LOW");
    }
    const updated = await tx.learningSession.update({ where: { id: session.id }, data: { status, lastHeartbeatAt: now, lastClientTimestamp: clientTimestamp, lastInteractionCount: Math.max(session.lastInteractionCount, value.interactionCount), activeSeconds: { increment: creditedSeconds }, idleSeconds: { increment: elapsedSeconds > MOTIVATION_CONFIG.heartbeat.maximumIntervalSeconds ? elapsedSeconds : 0 } } });
    if (creditedSeconds) await tx.userDailyActivity.update({ where: { userId_date: { userId, date: context.date } }, data: { activeSeconds: { increment: creditedSeconds } } });
    const dailyGoal = await checkDailyGoalCompletionInTransaction(tx, userId, context.date);
    return { session: updated, creditedSeconds, reason: policy.reason, dailyGoal };
  });
}

export async function completeLearningSession(userId: string, sessionId: string) {
  return prisma.learningSession.updateMany({ where: { id: sessionId, userId, status: { in: ["ACTIVE", "PAUSED"] } }, data: { status: "COMPLETED", completedAt: new Date() } });
}

export type FirstTryLessonStreak = {
  /** Every answer that was correct on the first try in this completed session. */
  firstTryCorrectTotal: number;
  /** The largest uninterrupted first-try-correct segment in the session. */
  longestFirstTryRun: number;
};

/**
 * Corrected answers deliberately break a run. We track both values because
 * the lesson's perfect-answer credit is the total (2 + 5 = 7 in the product
 * example), while the longest continuous run remains a separate, auditable
 * number (5 in that same example).
 */
export function calculateFirstTryLessonStreak(attempts: Array<{ exerciseId: string; isCorrect: boolean }>): FirstTryLessonStreak {
  const attemptedExerciseIds = new Set<string>();
  let firstTryCorrectTotal = 0;
  let currentRun = 0;
  let longestFirstTryRun = 0;

  for (const attempt of attempts) {
    const isFirstTryForExercise = !attemptedExerciseIds.has(attempt.exerciseId);
    attemptedExerciseIds.add(attempt.exerciseId);
    if (isFirstTryForExercise && attempt.isCorrect) {
      firstTryCorrectTotal += 1;
      currentRun += 1;
      longestFirstTryRun = Math.max(longestFirstTryRun, currentRun);
    } else {
      // A wrong answer, and a subsequent correction of that same task, may
      // never continue or restart a First-Time Right streak.
      currentRun = 0;
    }
  }
  return { firstTryCorrectTotal, longestFirstTryRun };
}

/**
 * Saves a lesson session's perfect-answer result only after the learner uses
 * Next on a completed lesson. The request carries a session id but never
 * accepts totals, multipliers or any other browser-calculated reward value.
 */
export async function finalizeLessonSessionPerfectStreak(userId: string, lessonId: string, learningSessionId: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.lessonSessionPerfectStreak.findUnique({
      where: { learningSessionId },
      select: { firstTryCorrectTotal: true, longestFirstTryRun: true },
    });
    if (existing) return { ...existing, finalized: false };

    const [session, progress, latestSession] = await Promise.all([
      tx.learningSession.findFirst({
        where: { id: learningSessionId, userId, lessonId, type: "LESSON" },
        select: { id: true, startedAt: true },
      }),
      tx.lessonProgress.findUnique({
        where: { userId_lessonId: { userId, lessonId } },
        select: { status: true },
      }),
      tx.learningSession.findFirst({
        where: { userId, lessonId, type: "LESSON" },
        orderBy: { startedAt: "desc" },
        select: { id: true },
      }),
    ]);
    if (!session || latestSession?.id !== learningSessionId) throw new Error("This lesson session is no longer active.");
    if (progress?.status !== "COMPLETED") throw new Error("Finish the lesson before continuing.");

    const attempts = await tx.exerciseAttempt.findMany({
      where: { userId, lessonId, createdAt: { gte: session.startedAt } },
      orderBy: [{ createdAt: "asc" }, { attemptNumber: "asc" }],
      select: { exerciseId: true, isCorrect: true },
    });
    const calculated = calculateFirstTryLessonStreak(attempts);
    const saved = await tx.lessonSessionPerfectStreak.create({
      data: { userId, lessonId, learningSessionId, ...calculated },
      select: { firstTryCorrectTotal: true, longestFirstTryRun: true },
    });
    return { ...saved, finalized: true };
  });
}

export async function recordExerciseResult(tx: Tx, input: { userId: string; exerciseId: string; lessonId: string; courseId?: string; attemptId: string; isCorrect: boolean; isFirstAttemptCorrect: boolean; score: number; difficulty: number; isSpacedReview?: boolean; speedExperience?: number }) {
  const context = await userContext(tx, input.userId);
  await ensureDailyActivity(tx, input.userId, context.date);
  await tx.learningActivity.create({ data: { userId: input.userId, type: "EXERCISE_SUBMITTED", courseId: input.courseId, lessonId: input.lessonId, exerciseId: input.exerciseId, score: input.score } });
  await tx.learningActivity.create({ data: { userId: input.userId, type: input.isCorrect ? "EXERCISE_CORRECT" : "EXERCISE_INCORRECT", courseId: input.courseId, lessonId: input.lessonId, exerciseId: input.exerciseId, score: input.score } });
  await tx.userDailyActivity.update({ where: { userId_date: { userId: input.userId, date: context.date } }, data: { exercisesCompleted: { increment: 1 }, correctAnswers: { increment: input.isCorrect ? 1 : 0 }, incorrectAnswers: { increment: input.isCorrect ? 0 : 1 } } });
  // A streak represents a chain of perfect first answers. A wrong answer
  // always breaks it, and a later retry cannot rebuild it or harvest bonus XP.
  const qualifiesForStreak = input.isCorrect && input.isFirstAttemptCorrect;
  const level = await tx.userLevel.upsert({
    where: { userId: input.userId },
    create: { userId: input.userId, currentCorrectStreak: qualifiesForStreak ? 1 : 0, bestCorrectStreak: qualifiesForStreak ? 1 : 0 },
    update: qualifiesForStreak ? { currentCorrectStreak: { increment: 1 } } : { currentCorrectStreak: 0 },
  });
  if (qualifiesForStreak && level.currentCorrectStreak > level.bestCorrectStreak) {
    await tx.userLevel.update({ where: { userId: input.userId }, data: { bestCorrectStreak: level.currentCorrectStreak } });
  }
  const streak = qualifiesForStreak ? correctAnswerStreak(level.currentCorrectStreak) : null;
  const reward = qualifiesForStreak
    ? input.isSpacedReview
      ? await rewardSpacedReviewAnswer(tx, input.userId, context.date, input.exerciseId, streak?.bonusExperience, input.speedExperience)
      : await rewardFirstCorrectExercise(tx, input.userId, context.date, input.exerciseId, streak?.bonusExperience, input.speedExperience)
    : { awarded: false, experience: 0, coins: 0, levelUp: false };
  await evaluateAchievements(tx, input.userId, context.date);
  return { ...reward, streak };
}

/** Awards a focused-review completion exactly once per persisted review run.
 * The caller must first atomically mark the run COMPLETED. */
export async function recordMistakeReviewRunCompletion(tx: Tx, input: { userId: string; runId: string; firstFocusedRun: boolean }) {
  const context = await userContext(tx, input.userId);
  const reward = await creditExperienceAndCoins(tx, {
    userId: input.userId,
    experienceAmount: input.firstFocusedRun ? 35 : 15,
    coinAmount: 0,
    experienceType: "ACHIEVEMENT_REWARD",
    coinType: "ACHIEVEMENT_REWARD",
    sourceType: "MISTAKE_REVIEW_RUN",
    sourceId: input.runId,
    idempotencyKey: `mistake-review-run:${input.runId}`,
    description: "Focused mistake review completed",
    date: context.date,
  });
  const achievements = await evaluateAchievements(tx, input.userId, context.date);
  return { ...reward, achievements };
}

export async function recordLessonCompletion(tx: Tx, userId: string, lessonId: string, courseId: string, firstCompletion: boolean) {
  if (!firstCompletion) return { awarded: false, experience: 0, coins: 0, levelUp: false };
  const context = await userContext(tx, userId);
  await ensureDailyActivity(tx, userId, context.date);
  await tx.userDailyActivity.update({ where: { userId_date: { userId, date: context.date } }, data: { lessonsCompleted: { increment: 1 } } });
  await tx.learningActivity.create({ data: { userId, type: "LESSON_COMPLETED", courseId, lessonId } });
  const reward = await rewardForEvent(tx, userId, context.date, "LESSON_COMPLETED", lessonId, "Lesson completed");
  const [totalLessons, completedLessons] = await Promise.all([
    tx.lesson.count({ where: { module: { courseId, isPublished: true }, isPublished: true } }),
    tx.lessonProgress.count({ where: { userId, status: "COMPLETED", lesson: { module: { courseId } } } }),
  ]);
  if (totalLessons > 0 && completedLessons >= totalLessons) {
    const previous = await tx.learningActivity.findFirst({ where: { userId, type: "COURSE_COMPLETED", courseId } });
    if (!previous) { await tx.learningActivity.create({ data: { userId, type: "COURSE_COMPLETED", courseId } }); await rewardForEvent(tx, userId, context.date, "COURSE_COMPLETED", courseId, "Course completed"); }
  }
  const nightWatch = userLocalHour(context.timeZone) === 3
    ? await awardSpecialBadge(tx, userId, "NIGHT_WATCH")
    : null;
  await evaluateAchievements(tx, userId, context.date);
  return { ...reward, achievements: nightWatch ? [nightWatch.title] : [] };
}

/**
 * Credits a learner only after the placement flow reaches its final result.
 * The per-user idempotency key makes retries and later retakes safe.
 */
export async function recordPlacementTestCompletion(tx: Tx, userId: string) {
  const context = await userContext(tx, userId);
  const reward = await creditExperienceAndCoins(tx, {
    userId,
    experienceAmount: PLACEMENT_TEST_COMPLETION_XP,
    coinAmount: 0,
    experienceType: "PLACEMENT_TEST_COMPLETED",
    // No coin transaction is created for a zero amount; this value is only
    // required by the shared reward helper's typed interface.
    coinType: "LESSON_REWARD",
    sourceType: "PLACEMENT_TEST",
    sourceId: "initial-placement",
    idempotencyKey: `placement-test-completed:${userId}`,
    description: "Placement test completed",
    date: context.date,
  });
  await evaluateAchievements(tx, userId, context.date);
  return reward;
}

export async function recordVocabularyReview(tx: Tx, input: { userId: string; vocabularySessionId: string; reviewId: string; isCorrect: boolean; sessionCompleted: boolean; warmUp: boolean }) {
  const context = await userContext(tx, input.userId);
  await ensureDailyActivity(tx, input.userId, context.date);
  await tx.userDailyActivity.update({ where: { userId_date: { userId: input.userId, date: context.date } }, data: { vocabularyReviews: { increment: 1 } } });
  await tx.learningActivity.create({ data: { userId: input.userId, type: "WORD_REVIEWED", vocabularySessionId: input.vocabularySessionId, score: input.isCorrect ? 1 : 0 } });
  // A review attempt is the source of truth for this reward.  A session can contain
  // many attempts, so using the session ID here would incorrectly deduplicate them.
  // A vocabulary review has one submitted answer. Like every other learner
  // exercise, it can earn XP only when that answer is correct.
  const reviewReward = input.isCorrect
    ? await rewardForEvent(tx, input.userId, context.date, "VOCABULARY_REVIEW", input.reviewId, "Vocabulary review")
    : { awarded: false, experience: 0, coins: 0, levelUp: false };
  if (input.sessionCompleted) {
    const existing = await tx.learningActivity.findFirst({ where: { userId: input.userId, vocabularySessionId: input.vocabularySessionId, type: input.warmUp ? "WARM_UP_COMPLETED" : "VOCABULARY_SESSION_COMPLETED" } });
    if (!existing) {
      await tx.learningActivity.create({ data: { userId: input.userId, type: input.warmUp ? "WARM_UP_COMPLETED" : "VOCABULARY_SESSION_COMPLETED", vocabularySessionId: input.vocabularySessionId } });
      await tx.userDailyActivity.update({ where: { userId_date: { userId: input.userId, date: context.date } }, data: input.warmUp ? { warmUpsCompleted: { increment: 1 } } : { vocabularySessions: { increment: 1 } } });
      await rewardForEvent(tx, input.userId, context.date, input.warmUp ? "WARM_UP_COMPLETED" : "VOCABULARY_SESSION_COMPLETED", input.vocabularySessionId, input.warmUp ? "Warm-up completed" : "Vocabulary session completed");
    }
  }
  await evaluateAchievements(tx, input.userId, context.date);
  return reviewReward;
}

export async function recordWordAdded(userId: string, wordId: string) {
  const context = await prisma.user.findUnique({ where: { id: userId }, select: { timeZone: true } });
  return prisma.learningActivity.create({ data: { userId, type: "WORD_ADDED", metadata: json({ wordId, date: userLocalDate(context?.timeZone) }) } });
}

export async function getMotivationOverview(userId: string) {
  return prisma.$transaction(async (tx) => {
    const context = await userContext(tx, userId);
    const [daily, level, wallet, streak, learningBonuses] = await Promise.all([
      ensureDailyActivity(tx, userId, context.date),
      tx.userLevel.upsert({ where: { userId }, create: { userId }, update: {} }),
      tx.userWallet.upsert({ where: { userId }, create: { userId }, update: {} }),
      tx.userStreak.upsert({ where: { userId }, create: { userId }, update: {} }),
      tx.userLearningBonusBalance.upsert({ where: { userId }, create: { userId }, update: {} }),
    ]);
    return {
      date: context.date,
      timeZone: context.timeZone,
      dailyGoalMinutes: context.dailyGoalMinutes,
      daily,
      level,
      wallet: { balance: wallet.balance, fractionalBalance: wallet.fractionalBalance },
      streak,
      streakRecovery: {
        available: streak.recoverableStreak > 0,
        streakLength: streak.recoverableStreak,
        experienceCost: streak.recoverableStreak > 0 ? streakRestoreXpCost(streak.recoverableStreak) : 0,
        coinCostMinor: streak.recoverableStreak > 0 ? streakRestoreCoinCostMinor(streakRestoreXpCost(streak.recoverableStreak)) : 0,
        waterLilyCount: streak.waterLilyCount,
      },
      learningBonuses: { hintCredits: learningBonuses.hintCredits, translationCredits: learningBonuses.translationCredits },
    };
  });
}

/** Direct XP-to-KRIN exchange rate. Coin balances never contribute to rank. */
export const XP_PER_KRIN_COIN = 1_000;
const COIN_MINOR_PER_COIN = 100;
/** A freeze protects one missed calendar day in a qualified daily streak. */
export const STREAK_FREEZE_PRICE_COINS = 1;
export const WEEKLY_EASTER_EGG_XP = 500;

/** Server-owned cost grid for restoring a burned daily streak. */
export function streakRestoreXpCost(streakLength: number) {
  const length = Math.max(0, Math.trunc(streakLength));
  if (length >= 100) return 200 + Math.floor((length - 100) / 25) * 50;
  if (length >= 81) return 120;
  if (length >= 71) return 90;
  if (length >= 51) return 80;
  if (length >= 31) return 70;
  if (length >= 21) return 50;
  if (length >= 11) return 40;
  return 30;
}

/** KRIN Coins use the established 1,000 XP = 1.00 coin ratio. */
export function streakRestoreCoinCostMinor(experienceCost: number) {
  return Math.max(1, Math.ceil((Math.max(0, experienceCost) / XP_PER_KRIN_COIN) * COIN_MINOR_PER_COIN));
}

async function lockStreakRestore(tx: Tx, userId: string) {
  await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${`streak-restore:${userId}`}))`);
}

/**
 * Restores the one server-recorded burned streak. Resource priority is fixed:
 * Water Lily -> XP -> KRIN Coins. All balances and the restored
 * streak change inside a single transaction so neither an altered browser
 * request nor two tabs can spend/restore twice.
 */
export async function restoreLostStreak(userId: string) {
  return prisma.$transaction(async (tx) => {
    await lockStreakRestore(tx, userId);
    const context = await userContext(tx, userId);
    const streak = await tx.userStreak.upsert({ where: { userId }, create: { userId }, update: {} });
    if (streak.recoverableStreak < 1 || !streak.streakLostAt) throw new Error("There is no burned streak to restore.");

    const previousStreak = streak.currentStreak;
    const restoredStreak = streak.recoverableStreak + Math.max(1, streak.currentStreak);
    const experienceCost = streakRestoreXpCost(streak.recoverableStreak);
    const coinCostMinor = streakRestoreCoinCostMinor(experienceCost);
    const restoreId = randomUUID();
    let paidWith: "WATER_LILY" | "XP" | "KRIN_COINS";
    let perfectSession: FirstTryLessonStreak | null = null;

    if (streak.waterLilyCount > 0) {
      // A Water Lily applies only after a completed lesson's final Next. The
      // saved result is calculated from authoritative attempts, never from a
      // client-side consecutive-answer counter.
      const perfectSessions = await tx.lessonSessionPerfectStreak.aggregate({
        where: { userId, finalizedAt: { gte: streak.streakLostAt } },
        _sum: { firstTryCorrectTotal: true },
        _max: { longestFirstTryRun: true },
      });
      const firstTryCorrectTotal = perfectSessions._sum.firstTryCorrectTotal ?? 0;
      if (!firstTryCorrectTotal) {
        throw new Error("Finish a lesson with at least one first-try correct answer before using a Water Lily.");
      }
      perfectSession = { firstTryCorrectTotal, longestFirstTryRun: perfectSessions._max.longestFirstTryRun ?? 0 };
      const consumed = await tx.userStreak.updateMany({
        where: { id: streak.id, waterLilyCount: { gte: 1 }, recoverableStreak: { gt: 0 } },
        data: { waterLilyCount: { decrement: 1 } },
      });
      if (!consumed.count) throw new Error("The Water Lily is no longer available.");
      paidWith = "WATER_LILY";
    } else {
      const level = await tx.userLevel.upsert({ where: { userId }, create: { userId }, update: {} });
      const wallet = await tx.userWallet.upsert({ where: { userId }, create: { userId }, update: {} });
      if (level.lifetimeExperience >= experienceCost) {
        const deducted = await tx.userLevel.updateMany({
          where: { id: level.id, lifetimeExperience: { gte: experienceCost } },
          data: { lifetimeExperience: { decrement: experienceCost } },
        });
        if (!deducted.count) throw new Error("Insufficient XP to restore this streak.");
        const reducedLevel = await tx.userLevel.findUniqueOrThrow({ where: { id: level.id } });
        await tx.userLevel.update({ where: { id: level.id }, data: calculateUserLevel(reducedLevel.lifetimeExperience) });
        await tx.experienceTransaction.create({
          data: {
            userId,
            amount: -experienceCost,
            type: "XP_EXCHANGE",
            sourceType: "STREAK_RESTORE",
            sourceId: restoreId,
            idempotencyKey: `streak-restore-xp:${userId}:${restoreId}`,
            localDate: context.date,
            description: `Restored ${streak.recoverableStreak}-day streak for ${experienceCost} XP`,
          },
        });
        paidWith = "XP";
      } else {
        const currentMinor = wallet.balance * COIN_MINOR_PER_COIN + wallet.fractionalBalance;
        if (currentMinor < coinCostMinor) throw new Error("Insufficient XP and KRIN Coins to restore this streak.");
        const updatedMinor = currentMinor - coinCostMinor;
        const deducted = await tx.$executeRaw(Prisma.sql`
          UPDATE "UserWallet"
          SET "balance" = ${Math.floor(updatedMinor / COIN_MINOR_PER_COIN)},
              "fractionalBalance" = ${updatedMinor % COIN_MINOR_PER_COIN},
              "lifetimeSpent" = "lifetimeSpent" + ${Math.floor(coinCostMinor / COIN_MINOR_PER_COIN)}
          WHERE "id" = ${wallet.id}
            AND ("balance" * ${COIN_MINOR_PER_COIN} + "fractionalBalance") >= ${coinCostMinor}
        `);
        if (!deducted) throw new Error("Insufficient KRIN Coins to restore this streak.");
        const updatedWallet = await tx.userWallet.findUniqueOrThrow({ where: { id: wallet.id } });
        await tx.coinTransaction.create({
          data: {
            userId,
            walletId: wallet.id,
            amount: 0,
            amountMinor: -coinCostMinor,
            balanceBefore: wallet.balance,
            balanceAfter: updatedWallet.balance,
            balanceBeforeMinor: currentMinor,
            balanceAfterMinor: updatedMinor,
            type: "PURCHASE",
            sourceType: "STREAK_RESTORE_KRIN_COIN",
            sourceId: restoreId,
            idempotencyKey: `streak-restore-krin-coin:${userId}:${restoreId}`,
            localDate: context.date,
            description: `Restored ${streak.recoverableStreak}-day streak for ${(coinCostMinor / COIN_MINOR_PER_COIN).toFixed(2)} KRIN Coins`,
          },
        });
        paidWith = "KRIN_COINS";
      }
    }

    const restored = await tx.userStreak.update({
      where: { id: streak.id },
      data: {
        currentStreak: restoredStreak,
        longestStreak: Math.max(streak.longestStreak, restoredStreak),
        recoverableStreak: 0,
        streakLostAt: null,
      },
    });
    await tx.streakEvent.create({
      data: {
        userId,
        type: "RESTORED",
        date: context.date,
        previousStreak,
        nextStreak: restoredStreak,
        metadata: json({ paidWith, experienceCost, coinCostMinor, perfectSession }),
      },
    });
    const [level, wallet] = await Promise.all([
      tx.userLevel.upsert({ where: { userId }, create: { userId }, update: {} }),
      tx.userWallet.upsert({ where: { userId }, create: { userId }, update: {} }),
    ]);
    return { streak: restored, level, wallet, paidWith, experienceCost, coinCostMinor, perfectSession };
  });
}

/**
 * Buys a single, server-recorded streak freeze. The balance check and the
 * deduction share one transaction, so a double click cannot spend coins the
 * learner no longer has. A freeze is consumed automatically only when the
 * learner returns after exactly one missed qualified day.
 */
export async function purchaseStreakFreeze(userId: string) {
  return prisma.$transaction(async (tx) => {
    const context = await userContext(tx, userId);
    const wallet = await tx.userWallet.upsert({ where: { userId }, create: { userId }, update: {} });
    const deduction = await tx.userWallet.updateMany({
      where: { id: wallet.id, balance: { gte: STREAK_FREEZE_PRICE_COINS } },
      data: {
        balance: { decrement: STREAK_FREEZE_PRICE_COINS },
        lifetimeSpent: { increment: STREAK_FREEZE_PRICE_COINS },
      },
    });
    if (!deduction.count) throw new Error("Insufficient KRIN Coins");

    const updatedWallet = await tx.userWallet.findUniqueOrThrow({ where: { id: wallet.id } });
    const purchaseId = randomUUID();
    await tx.coinTransaction.create({
      data: {
        userId,
        walletId: wallet.id,
        amount: -STREAK_FREEZE_PRICE_COINS,
        balanceBefore: wallet.balance,
        balanceAfter: updatedWallet.balance,
        balanceBeforeMinor: wallet.balance * 100 + wallet.fractionalBalance,
        balanceAfterMinor: updatedWallet.balance * 100 + updatedWallet.fractionalBalance,
        type: "PURCHASE",
        sourceType: "STREAK_FREEZE",
        sourceId: purchaseId,
        idempotencyKey: `streak-freeze:${userId}:${purchaseId}`,
        localDate: context.date,
        description: "Streak Freeze purchased",
      },
    });
    const streak = await tx.userStreak.upsert({
      where: { userId },
      create: { userId, freezeCount: 1 },
      update: { freezeCount: { increment: 1 } },
    });
    return { streak, wallet: updatedWallet, price: STREAK_FREEZE_PRICE_COINS };
  });
}

/**
 * Awards the logo Easter egg at most once in the learner's calendar week.
 * The unique experience idempotency key is the durable guard: it protects
 * concurrent requests and does not trust any client-side cooldown.
 */
export async function claimWeeklyEasterEgg(userId: string) {
  return prisma.$transaction(async (tx) => {
    const context = await userContext(tx, userId);
    const weekStart = localWeekStart(context.date);
    const weekKey = `easter-egg:${userId}:${weekStart}`;
    const existing = await tx.experienceTransaction.findUnique({ where: { idempotencyKey: weekKey }, select: { id: true } });
    if (existing) return { claimed: false, experience: 0, weekStart };
    const reward = await creditExperienceAndCoins(tx, {
      userId,
      experienceAmount: WEEKLY_EASTER_EGG_XP,
      coinAmount: 0,
      experienceType: "ACHIEVEMENT_REWARD",
      coinType: "ACHIEVEMENT_REWARD",
      sourceType: "EASTER_EGG",
      sourceId: weekStart,
      idempotencyKey: weekKey,
      description: "KRIN explorer Easter egg",
      date: context.date,
    });
    return { claimed: reward.awarded, experience: reward.experience, weekStart };
  }).catch((error: unknown) => {
    // Concurrent weekly claims race on the unique idempotency key. The losing
    // transaction is rolled back in full, then behaves as an already-claimed
    // request instead of surfacing a database implementation detail.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { claimed: false, experience: 0, weekStart: "" };
    }
    throw error;
  });
}

/** Direct exchange of spendable XP into KRIN Coins. The permanent rank XP is
 * earned by the original positive reward ledger and never reduced by this
 * exchange; neither purchased nor exchanged coins can add rank XP. */
export async function exchangeExperienceForKrinCoins(userId: string, requestedExperience: number, requestId: string = randomUUID()) {
  const exchangedExperience = Math.trunc(requestedExperience);
  if (!Number.isSafeInteger(exchangedExperience) || exchangedExperience < 10) {
    throw new Error("Enter at least 10 XP to receive 0.01 KRIN Coin.");
  }
  const addedMinor = Math.round((exchangedExperience / XP_PER_KRIN_COIN) * COIN_MINOR_PER_COIN);
  const idempotencyKey = `xp-to-krin:${userId}:${requestId}`;
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${`xp-to-krin:${userId}`}))`);
    const context = await userContext(tx, userId);
    const previous = await tx.experienceTransaction.findUnique({ where: { idempotencyKey }, select: { amount: true } });
    if (previous) {
      const [level, wallet] = await Promise.all([
        tx.userLevel.findUniqueOrThrow({ where: { userId } }),
        tx.userWallet.findUniqueOrThrow({ where: { userId } }),
      ]);
      return { exchangedExperience: -previous.amount, krinCoinsAdded: Math.round((-previous.amount / XP_PER_KRIN_COIN) * COIN_MINOR_PER_COIN) / COIN_MINOR_PER_COIN, level, wallet };
    }
    await tx.userLevel.upsert({ where: { userId }, create: { userId }, update: {} });
    const deducted = await tx.userLevel.updateMany({ where: { userId, lifetimeExperience: { gte: exchangedExperience } }, data: { lifetimeExperience: { decrement: exchangedExperience } } });
    if (!deducted.count) throw new Error("You do not have enough XP for this exchange.");
    const reduced = await tx.userLevel.findUniqueOrThrow({ where: { userId } });
    const level = await tx.userLevel.update({ where: { userId }, data: calculateUserLevel(reduced.lifetimeExperience) });
    await tx.experienceTransaction.create({ data: {
      userId, amount: -exchangedExperience, type: "XP_EXCHANGE", sourceType: "XP_EXCHANGE", sourceId: requestId,
      idempotencyKey, localDate: context.date, description: `${exchangedExperience} XP exchanged for ${(addedMinor / 100).toFixed(2)} KRIN Coins`,
    } });
    const wallet = await tx.userWallet.upsert({ where: { userId }, create: { userId }, update: {} });
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "UserWallet" WHERE "id" = ${wallet.id} FOR UPDATE`);
    const lockedWallet = await tx.userWallet.findUniqueOrThrow({ where: { id: wallet.id } });
    const beforeMinor = lockedWallet.balance * 100 + lockedWallet.fractionalBalance;
    const afterMinor = beforeMinor + addedMinor;
    const updatedWallet = await tx.userWallet.update({ where: { id: wallet.id }, data: {
      balance: Math.floor(afterMinor / 100), fractionalBalance: afterMinor % 100,
      lifetimeEarned: { increment: Math.floor(afterMinor / 100) - lockedWallet.balance },
    } });
    await tx.coinTransaction.create({ data: {
      userId, walletId: wallet.id, amount: Math.floor(addedMinor / 100), amountMinor: addedMinor,
      balanceBefore: lockedWallet.balance, balanceAfter: updatedWallet.balance,
      balanceBeforeMinor: beforeMinor, balanceAfterMinor: afterMinor,
      type: "XP_EXCHANGE", sourceType: "XP_EXCHANGE", sourceId: requestId,
      idempotencyKey: `xp-to-krin-coin:${userId}:${requestId}`, localDate: context.date,
      description: `${exchangedExperience} XP exchanged for ${(addedMinor / 100).toFixed(2)} KRIN Coins`,
    } });
    return { exchangedExperience, krinCoinsAdded: addedMinor / 100, level, wallet: updatedWallet };
  });
}

/**
 * Learner-facing preview of the currently active rewards. The actual credit
 * remains server-side and idempotent, so this value is never trusted to award
 * XP on the client.
 */
export async function getLearningRewardPreview() {
  const rules = await prisma.rewardRule.findMany({
    where: { eventType: { in: ["EXERCISE_CORRECT", "LESSON_COMPLETED"] } },
    select: { eventType: true, experienceAmount: true, isActive: true },
  });
  const byEvent = new Map(rules.map((rule) => [rule.eventType, rule]));
  const exercise = byEvent.get("EXERCISE_CORRECT");
  const lesson = byEvent.get("LESSON_COMPLETED");
  return {
    exercise: exercise?.isActive ? { experience: exercise.experienceAmount, coins: 0 } : { experience: 0, coins: 0 },
    lesson: lesson?.isActive ? { experience: lesson.experienceAmount, coins: 0 } : { experience: 0, coins: 0 },
  };
}

export async function getUserAnalytics(userId: string, days = 30) {
  const context = await prisma.user.findUnique({ where: { id: userId }, select: { timeZone: true } });
  const end = userLocalDate(context?.timeZone);
  const startDate = new Date(Date.now() - (Math.min(365, Math.max(7, days)) - 1) * 86_400_000);
  const start = userLocalDate(context?.timeZone, startDate);
  const [daily, level, wallet, streak, achievements, mistakes, completedCourses] = await Promise.all([
    prisma.userDailyActivity.findMany({ where: { userId, date: { gte: start, lte: end } }, orderBy: { date: "asc" } }),
    prisma.userLevel.upsert({ where: { userId }, create: { userId }, update: {} }),
    prisma.userWallet.upsert({ where: { userId }, create: { userId }, update: {} }),
    prisma.userStreak.upsert({ where: { userId }, create: { userId }, update: {} }),
    prisma.userAchievement.count({ where: { userId, completed: true } }),
    prisma.userMistake.count({ where: { userId, resolvedAt: null } }),
    prisma.learningActivity.count({ where: { userId, type: "COURSE_COMPLETED" } }),
  ]);
  const total = daily.reduce((sum, day) => ({ activeSeconds: sum.activeSeconds + day.activeSeconds, lessonsCompleted: sum.lessonsCompleted + day.lessonsCompleted, exercisesCompleted: sum.exercisesCompleted + day.exercisesCompleted, correctAnswers: sum.correctAnswers + day.correctAnswers, incorrectAnswers: sum.incorrectAnswers + day.incorrectAnswers, vocabularyReviews: sum.vocabularyReviews + day.vocabularyReviews, experienceEarned: sum.experienceEarned + day.experienceEarned }), { activeSeconds: 0, lessonsCompleted: 0, exercisesCompleted: 0, correctAnswers: 0, incorrectAnswers: 0, vocabularyReviews: 0, experienceEarned: 0 });
  return { periodDays: days, daily, total: { ...total, accuracy: total.correctAnswers + total.incorrectAnswers ? Math.round((total.correctAnswers / (total.correctAnswers + total.incorrectAnswers)) * 100) : 0, mistakes, completedCourses }, level, wallet, streak, achievements };
}

export async function listRewardHistory(userId: string, type?: string) {
  const [experience, coins, achievements, streakEvents] = await Promise.all([
    prisma.experienceTransaction.findMany({ where: { userId, ...(type === "COINS" ? { id: "__none__" } : {}) }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.coinTransaction.findMany({ where: { userId, ...(type === "EXPERIENCE" ? { id: "__none__" } : {}) }, orderBy: { createdAt: "desc" }, take: 100 }),
    type && type !== "ACHIEVEMENTS" ? Promise.resolve([]) : prisma.userAchievement.findMany({ where: { userId, completed: true }, include: { achievement: true }, orderBy: { completedAt: "desc" }, take: 100 }),
    type && type !== "STREAK" ? Promise.resolve([]) : prisma.streakEvent.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 100 }),
  ]);
  return { experience, coins, achievements, streakEvents };
}

export async function listUserAchievements(userId: string, filter = "ALL") {
  const achievements = await prisma.$transaction(async (tx) => {
    await ensureCoreQuestDefinitions(tx);
    return tx.achievement.findMany({ where: { isActive: true }, orderBy: { order: "asc" }, include: { userAchievements: { where: { userId }, take: 1 } } });
  });
  return achievements.filter((achievement) => {
    const userAchievement = achievement.userAchievements[0];
    // Event-only secret badges stay in reward history, but cannot appear as
    // impossible-to-activate quests in a learner's quest board.
    if (achievement.isHidden && !userAchievement?.completed) return false;
    if (filter === "AVAILABLE") return !userAchievement?.activatedAt;
    if (filter === "ACTIVE") return Boolean(userAchievement?.activatedAt) && !userAchievement.completed;
    if (filter === "COMPLETED") return userAchievement?.completed;
    return true;
  }).map((achievement) => ({
    ...achievement,
    progress: achievement.userAchievements[0]?.progress ?? 0,
    target: achievement.userAchievements[0]?.target ?? Number((achievement.conditionConfig as { target?: number }).target ?? 1),
    activatedAt: achievement.userAchievements[0]?.activatedAt ?? null,
    completed: achievement.userAchievements[0]?.completed ?? false,
    completedAt: achievement.userAchievements[0]?.completedAt ?? null,
  }));
}

/** Activates a visible quest and records the metric value at that moment, so
 * only learning completed after activation can advance it. */
export async function activateUserQuest(userId: string, achievementId: string) {
  return prisma.$transaction(async (tx) => {
    const achievement = await tx.achievement.findFirst({ where: { id: achievementId, isActive: true, isHidden: false } });
    if (!achievement) throw new Error("This quest is not available.");

    const existing = await tx.userAchievement.findUnique({ where: { userId_achievementId: { userId, achievementId } } });
    if (existing?.activatedAt) return existing;

    const [level, streak] = await Promise.all([
      tx.userLevel.upsert({ where: { userId }, create: { userId }, update: {} }),
      tx.userStreak.upsert({ where: { userId }, create: { userId }, update: {} }),
    ]);
    const config = (achievement.conditionConfig ?? {}) as { target?: unknown; absolute?: unknown };
    const target = Math.max(1, Number(config.target ?? 1));
    const baseline = config.absolute === true
      ? 0
      : await achievementMetric(tx, userId, achievement.conditionType, streak.currentStreak, level.lifetimeExperience, level.currentCorrectStreak);
    return tx.userAchievement.upsert({
      where: { userId_achievementId: { userId, achievementId } },
      create: { userId, achievementId, target, baseline, activatedAt: new Date() },
      update: { target, baseline, progress: 0, activatedAt: new Date() },
    });
  });
}

export async function updateMotivationSettings(userId: string, input: unknown) {
  const value = motivationSettingsSchema.parse(input);
  const timeZone = safeTimeZone(value.timeZone);
  // A public learner card only has meaning inside the opt-in community
  // directory. Turning off the directory immediately hides the card too.
  const publicProfileUpdate = value.showInLeaderboard === false
    ? { showPublicProfile: false }
    : value.showPublicProfile === undefined ? {} : { showPublicProfile: value.showPublicProfile };
  return prisma.user.update({
    where: { id: userId },
    data: {
      dailyGoalMinutes: value.dailyGoalMinutes,
      timeZone,
      ...(value.showInLeaderboard === undefined ? {} : { showInLeaderboard: value.showInLeaderboard }),
      ...publicProfileUpdate,
    },
    select: { dailyGoalMinutes: true, timeZone: true, showInLeaderboard: true, showPublicProfile: true },
  });
}

type LeaderboardSource = {
  id: string;
  name: string;
  firstName: string | null;
  showInLeaderboard: boolean;
  showPublicProfile: boolean;
  username: string;
  createdAt: Date;
  level: {
    level: number;
    lifetimeExperience: number;
    fractionalExperience: number;
    leaderboardExperienceMinor: number;
  } | null;
};

export type LearnerLeaderboardEntry = {
  rank: number;
  userId: string;
  displayName: string;
  level: number;
  /** Balances and permanent rank score are kept in hundredths. */
  experienceMinor: number;
  totalMinor: number;
  isCurrentUser: boolean;
  isProfileVisible: boolean;
  publicProfileUsername: string | null;
};

function motivationMinor(whole: number, fraction: number | null | undefined) {
  return Math.max(0, whole) * 100 + Math.max(0, Math.min(99, fraction ?? 0));
}

function rankLearners(rows: LeaderboardSource[], currentUserId?: string): LearnerLeaderboardEntry[] {
  return rows
    .map((row) => {
      const experienceMinor = motivationMinor(row.level?.lifetimeExperience ?? 0, row.level?.fractionalExperience);
      return {
        userId: row.id,
        displayName: row.firstName?.trim() || row.name.trim().split(/\s+/)[0] || "Learner",
        level: row.level?.level ?? 1,
        experienceMinor,
        totalMinor: Math.max(0, row.level?.leaderboardExperienceMinor ?? 0),
        isProfileVisible: row.showInLeaderboard,
        publicProfileUsername: row.showInLeaderboard && row.showPublicProfile ? row.username : null,
        createdAt: row.createdAt,
      };
    })
    // The score is permanent earned XP. The remaining fields merely make equal
    // scores stable instead of moving places between dashboard refreshes.
    .sort((left, right) => right.totalMinor - left.totalMinor || left.createdAt.getTime() - right.createdAt.getTime() || left.userId.localeCompare(right.userId))
    .map(({ createdAt: _createdAt, ...entry }, index) => ({
      ...entry,
      rank: index + 1,
      isCurrentUser: entry.userId === currentUserId,
    }));
}

async function leaderboardSources(where: Prisma.UserWhereInput) {
  const rows = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      firstName: true,
      username: true,
      showInLeaderboard: true,
      showPublicProfile: true,
      createdAt: true,
      userLevelProgress: { select: { level: true, lifetimeExperience: true, fractionalExperience: true, leaderboardExperienceMinor: true } },
    },
  });
  return rows.map(({ userLevelProgress, ...row }) => ({ ...row, level: userLevelProgress }));
}

/** Public ranking uses the same permanent earned-XP score as the dashboard. */
export async function listPublicLeaderboard(limit = 20) {
  const rows = await prisma.userLevel.findMany({
    where: { user: { showInLeaderboard: true, isBlocked: false, deletedAt: null, ...excludeSystemAccounts() } },
    orderBy: [{ leaderboardExperienceMinor: "desc" }, { level: "desc" }, { updatedAt: "asc" }],
    take: Math.min(Math.max(limit, 1), 50),
    select: { level: true, leaderboardExperienceMinor: true, user: { select: { name: true, username: true, showPublicProfile: true } } },
  });
  return rows.map((row, index) => ({
    rank: index + 1,
    displayName: row.user.name.trim().split(/\s+/)[0] || "Learner",
    level: row.level,
    experience: Math.floor(Math.max(0, row.leaderboardExperienceMinor) / 100),
    publicProfileUsername: row.user.showPublicProfile ? row.user.username : null,
  }));
}

/**
 * Every active registered account takes a place in the student ranking. People
 * who opted out of publishing remain anonymous to everyone except themselves.
 */
export async function getDashboardLeaderboard(userId: string, limit = 3) {
  const rows = await leaderboardSources({
    isBlocked: false,
    deletedAt: null,
    ...excludeSystemAccounts(),
  });
  const ranked = rankLearners(rows, userId);
  const current = ranked.find((entry) => entry.userId === userId) ?? null;
  // `totalMinor` is permanent earned XP. It is immutable with respect to XP
  // and coin exchanges; ordinary KRIN Coins are never included.
  const entries = ranked.slice(0, Math.max(limit, 1)).map((entry) => {
    const canShowProfile = entry.isProfileVisible || entry.isCurrentUser;
    return {
      rank: entry.rank,
      userId: entry.userId,
      displayName: canShowProfile ? entry.displayName : null,
      experienceMinor: canShowProfile ? entry.experienceMinor : null,
      totalMinor: canShowProfile ? entry.totalMinor : null,
      isCurrentUser: entry.isCurrentUser,
      isProfileVisible: entry.isProfileVisible,
      publicProfileUsername: canShowProfile ? entry.publicProfileUsername : null,
    };
  });
  return { entries, current, participantCount: ranked.length };
}

/** A compact, authenticated snapshot for post-reward rank movement UI. */
export async function getCurrentLeaderboardPosition(userId: string) {
  const leaderboard = await getDashboardLeaderboard(userId, 1);
  const rank = leaderboard.current?.rank ?? null;
  return {
    rank,
    participantCount: leaderboard.participantCount,
    positionsToTopThree: rank ? Math.max(0, rank - 3) : null,
  };
}

export async function listRewardRules() { return prisma.rewardRule.findMany({ orderBy: { eventType: "asc" } }); }
export async function updateRewardRule(actorId: string, eventType: RewardEvent, input: unknown) {
  const value = rewardRuleSchema.parse(input);
  // Exercise XP is protected per exercise by an idempotency key. A global cap
  // would make longer lessons stop rewarding learners before they finish.
  const withoutCoinRewards = { ...value, coinAmount: 0 };
  const normalized = eventType === "EXERCISE_CORRECT" ? { ...withoutCoinRewards, dailyLimit: null, weeklyLimit: null } : withoutCoinRewards;
  const rule = await prisma.rewardRule.upsert({ where: { eventType }, create: { eventType, ...normalized, conditions: normalized.conditions ? json(normalized.conditions) : undefined }, update: { ...normalized, conditions: normalized.conditions ? json(normalized.conditions) : undefined } });
  await prisma.contentAuditLog.create({ data: { actorId, action: "UPDATE", entityType: "RewardRule", entityId: rule.id, metadata: json({ eventType }) } });
  return rule;
}

export async function listAdminAchievements() { return prisma.achievement.findMany({ orderBy: { order: "asc" }, include: { _count: { select: { userAchievements: true } } } }); }

export async function saveAchievement(actorId: string, input: unknown, achievementId?: string) {
  const value = achievementSchema.parse(input);
  const { target, ...achievementFields } = value;
  const data = { ...achievementFields, conditionConfig: json({ target }) };
  const achievement = achievementId
    ? await prisma.achievement.update({ where: { id: achievementId }, data })
    : await prisma.achievement.create({ data });
  await prisma.contentAuditLog.create({ data: { actorId, action: achievementId ? "UPDATE" : "CREATE", entityType: "Achievement", entityId: achievement.id, metadata: json({ code: achievement.code }) } });
  return achievement;
}

export async function listSuspiciousActivities() { return prisma.suspiciousActivity.findMany({ where: { status: "OPEN" }, orderBy: [{ severity: "desc" }, { createdAt: "desc" }], take: 100, include: { user: { select: { email: true, name: true } } } }); }

export async function adjustUserRewards(adminId: string, input: unknown) {
  const value = adminRewardAdjustmentSchema.parse(input);
  if (!value.experienceAmount && !value.coinAmount) throw new Error("At least one adjustment amount is required");
  return prisma.$transaction(async (tx) => {
    const context = await userContext(tx, value.userId);
    const key = `admin-adjustment:${adminId}:${value.userId}:${randomUUID()}`;
    const result = await creditExperienceAndCoins(tx, { userId: value.userId, experienceAmount: value.experienceAmount, coinAmount: value.coinAmount, experienceType: "ADMIN_ADJUSTMENT", coinType: "ADMIN_ADJUSTMENT", sourceType: "ADMIN_ADJUSTMENT", sourceId: adminId, idempotencyKey: key, description: value.reason, date: context.date });
    await tx.contentAuditLog.create({ data: { actorId: adminId, action: "ADMIN_ADJUSTMENT", entityType: "UserReward", entityId: value.userId, metadata: json({ experienceAmount: value.experienceAmount, coinAmount: value.coinAmount, reason: value.reason, idempotencyKey: key }) } });
    return result;
  });
}

export async function getPlatformAnalytics() {
  const sinceDay = new Date(Date.now() - 24 * 60 * 60_000); const sinceWeek = new Date(Date.now() - 7 * 24 * 60 * 60_000);
  const [activeDay, activeWeek, newUsers, lessonsCompleted, coursesCompleted, daily, experience, coins, achievements, suspicious] = await Promise.all([
    prisma.learningActivity.groupBy({ by: ["userId"], where: { occurredAt: { gte: sinceDay } } }), prisma.learningActivity.groupBy({ by: ["userId"], where: { occurredAt: { gte: sinceWeek } } }), prisma.user.count({ where: { createdAt: { gte: sinceWeek } } }), prisma.learningActivity.count({ where: { type: "LESSON_COMPLETED", occurredAt: { gte: sinceWeek } } }), prisma.learningActivity.count({ where: { type: "COURSE_COMPLETED", occurredAt: { gte: sinceWeek } } }), prisma.userDailyActivity.aggregate({ where: { date: { gte: userLocalDate("UTC", sinceWeek) } }, _avg: { activeSeconds: true }, _sum: { correctAnswers: true, incorrectAnswers: true } }), prisma.experienceTransaction.aggregate({ _sum: { amount: true } }), prisma.coinTransaction.aggregate({ _sum: { amount: true } }), prisma.userAchievement.count({ where: { completed: true } }), prisma.suspiciousActivity.count({ where: { status: "OPEN" } }),
  ]);
  const correct = daily._sum.correctAnswers ?? 0; const incorrect = daily._sum.incorrectAnswers ?? 0;
  return { activeUsersDay: activeDay.length, activeUsersWeek: activeWeek.length, newUsers, lessonsCompleted, coursesCompleted, averageActiveSeconds: Math.round(daily._avg.activeSeconds ?? 0), accuracy: correct + incorrect ? Math.round((correct / (correct + incorrect)) * 100) : 0, experienceAwarded: experience._sum.amount ?? 0, coinsAwarded: coins._sum.amount ?? 0, achievements, openSuspiciousActivities: suspicious };
}
