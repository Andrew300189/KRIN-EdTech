import { randomInt, randomUUID } from "crypto";
import { Prisma } from "@/generated/prisma-client-payments-runtime";
import { prisma } from "@/core/server/prisma";
import { grantEconomyReward } from "./motivation.service";
import { creditedLessonWheelXp, lessonWheelXp } from "@/modules/motivation/utils/lesson-wheel-xp";
import { getStreakQuestBookForSource, maybeDropStreakQuestBook } from "./streak-quest-book.service";
import { correctAnswerStreak, streakChestKrinCoinReward, streakChestLevel } from "@/modules/motivation/utils/correct-answer-streak";
import { flowerRestoreCycle, isWhiteLily, selectRandomFlowerChest, type FlowerChestDefinition } from "@/modules/motivation/utils/flower-chests";
import { userLocalDate } from "@/modules/motivation/utils/local-date";
import { browserChestTimeZone, dailyChestAvailable, nextDailyChestAt, selectedChestTimeZone } from "@/modules/motivation/utils/daily-chest-date";
import { PURCHASABLE_AVATARS } from "@/modules/motivation/utils/shop-avatar-catalog";
import { consumableQuantity, PURCHASABLE_WATER_LILY_TIERS, WATER_LILY_SHOP_ID, WATER_LILY_TIERS, XP_BOOSTERS } from "@/modules/motivation/utils/shop-consumables";
import { SHOP_POSTCARDS } from "@/modules/motivation/utils/shop-postcards";

type ShopItemKind = "theme" | "avatar" | "discount" | "recovery" | "booster" | "collectible";

export type ShopItem = {
  id: string;
  kind: ShopItemKind;
  price: number;
  title: string;
  description: string;
  value?: number;
  rarity?: "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY";
};

/** All prices and effects live on the server. Never accept them from a form. */
export const SHOP_ITEMS: readonly ShopItem[] = [
  ...PURCHASABLE_WATER_LILY_TIERS.map((lily) => ({ id: lily.id, kind: "recovery" as const, price: lily.price, title: `Water Lily · ×${lily.capacity}`, description: `Restores an interrupted lesson answer streak of up to ${lily.capacity} verified correct answers.`, value: lily.capacity, rarity: lily.rarity })),
  ...XP_BOOSTERS.map((booster) => ({
    id: booster.id,
    kind: "booster" as const,
    price: booster.price,
    title: `Learning boost · +${booster.experience} XP`,
    description: `Automatically awards ${booster.experience} extra XP on your next newly completed lesson. One booster per lesson.`,
    value: booster.experience,
  })),
  { id: "theme-aurora", kind: "theme", price: 4, title: "Aurora theme", description: "A calm violet-and-mint workspace theme." },
  { id: "theme-sunrise", kind: "theme", price: 4, title: "Sunrise theme", description: "A warm, high-contrast workspace theme." },
  { id: "avatar-fox", kind: "avatar", price: 3, title: "Fox avatar", description: "A curious fox for your learner profile." },
  { id: "avatar-owl", kind: "avatar", price: 3, title: "Owl avatar", description: "A focused night-owl learner avatar." },
  ...PURCHASABLE_AVATARS.map((avatar) => ({
    id: avatar.id,
    kind: "avatar" as const,
    price: 3,
    title: avatar.label.en,
    description: avatar.description.en,
  })),
  ...SHOP_POSTCARDS.map((postcard) => ({ id: postcard.id, kind: "collectible" as const, price: 1, title: postcard.en, description: postcard.phrase })),
  { id: "premium-discount-10", kind: "discount", price: 12, title: "10% Premium or Pro discount", description: "One personal code for a future Premium or Pro checkout.", value: 10 },
] as const;

type EconomyBonusReward = {
  id: string;
  experience: number;
  hintCredits: number;
  translationCredits: number;
};

type StreakChestRewardBand = "LOW" | "MID" | "UPPER" | "JACKPOT";
type StreakChestDailyCounts = Record<StreakChestRewardBand, number>;
const STREAK_CHEST_XP_MINIMUM = 10;
const STREAK_CHEST_XP_MAXIMUM = 500;
const STREAK_CHEST_JACKPOT_VALUES = [300, 400, 500] as const;
export const STREAK_CHEST_DAILY_LIMITS: Record<"UPPER" | "MID", number> = {
  UPPER: 7,
  MID: 20,
};

export function streakChestRewardBand(experience: number): StreakChestRewardBand {
  if (experience >= 300) return "JACKPOT";
  if (experience > 200) return "UPPER";
  if (experience > 100) return "MID";
  return "LOW";
}

export function streakChestDailyCounts(experiences: readonly number[]): StreakChestDailyCounts {
  return experiences.reduce<StreakChestDailyCounts>((counts, experience) => {
    counts[streakChestRewardBand(experience)] += 1;
    return counts;
  }, { LOW: 0, MID: 0, UPPER: 0, JACKPOT: 0 });
}

export function canAwardStreakChestExperience(experience: number, counts: StreakChestDailyCounts) {
  const band = streakChestRewardBand(experience);
  // 300 / 400 / 500 XP are not a daily-random bucket: they are awarded only
  // by the exact 100, 200, 300 … checkpoint below.
  if (band === "LOW") return true;
  if (band === "JACKPOT") return false;
  return counts[band] < STREAK_CHEST_DAILY_LIMITS[band];
}

/** One large 300 / 400 / 500 XP gift belongs to every completed 100-answer
 * streak interval. It cannot be requested for the in-between checkpoints. */
export function isCenturyStreakChest(milestone: number) {
  return Number.isSafeInteger(milestone) && milestone >= 100 && milestone % 100 === 0;
}

/** The level, streak and verified task difficulty set a moving ceiling within
 * the requested 10–500 XP range. Higher values are still chance-based. */
export function streakChestExperienceCeiling(input: { milestone: number; chestLevel: number; difficulty: number; dailyStreak: number; userLevel?: number }) {
  const raw = 10
    + Math.sqrt(Math.max(0, input.milestone)) * 4.15
    + Math.max(1, input.chestLevel) * 0.18
    + Math.max(0, input.difficulty - 1) * 8
    + Math.min(100, Math.max(0, input.dailyStreak)) * 0.4
    + Math.min(80, Math.max(0, (input.userLevel ?? 1) - 1) * 0.8);
  return Math.max(STREAK_CHEST_XP_MINIMUM, Math.min(STREAK_CHEST_XP_MAXIMUM, Math.round(raw)));
}

function randomAmount(minimum: number, maximum: number, previous: number | null) {
  const value = randomInt(minimum, maximum + 1);
  // A random gift may repeat on another day, but it never repeats the
  // immediately preceding streak-chest amount when there is an alternative.
  if (value !== previous || minimum === maximum) return value;
  return value === maximum ? value - 1 : value + 1;
}

function weightedBand(bands: Array<{ band: StreakChestRewardBand; weight: number }>) {
  const total = bands.reduce((sum, candidate) => sum + candidate.weight, 0);
  let roll = randomInt(total);
  for (const candidate of bands) {
    if (roll < candidate.weight) return candidate.band;
    roll -= candidate.weight;
  }
  return "LOW" as const;
}

/** Samples an XP amount from the permitted daily buckets. A 300 / 400 / 500
 * jackpot is exclusively the reward for a 100-answer interval, once per
 * interval, rather than a probability that can occur on any other chest. */
export function selectStreakChestExperience(input: { ceiling: number; previous: number | null; previousJackpot: number | null; dailyCounts: StreakChestDailyCounts; isCenturyMilestone: boolean }) {
  if (input.isCenturyMilestone) {
    const choices = STREAK_CHEST_JACKPOT_VALUES.filter((value) => value !== input.previousJackpot);
    return choices[randomInt(choices.length)];
  }
  const ceiling = Math.max(STREAK_CHEST_XP_MINIMUM, Math.min(STREAK_CHEST_XP_MAXIMUM, input.ceiling));
  const candidates: Array<{ band: StreakChestRewardBand; weight: number }> = [{ band: "LOW", weight: 30 }];
  if (ceiling >= 101 && input.dailyCounts.MID < STREAK_CHEST_DAILY_LIMITS.MID) candidates.push({ band: "MID", weight: 8 });
  if (ceiling >= 201 && input.dailyCounts.UPPER < STREAK_CHEST_DAILY_LIMITS.UPPER) candidates.push({ band: "UPPER", weight: 3 });

  const band = weightedBand(candidates);
  if (band === "UPPER") return randomAmount(201, Math.min(299, ceiling), input.previous);
  if (band === "MID") return randomAmount(101, Math.min(200, ceiling), input.previous);
  return randomAmount(STREAK_CHEST_XP_MINIMUM, Math.min(100, ceiling), input.previous);
}

export type MilestoneChestKind = "FIRST_STEPS" | "LESSON_3" | "LESSON_7" | "LESSON_9" | "EVERY_3_LESSONS" | "EVERY_7_LESSONS" | "EVERY_9_LESSONS" | "EVERY_12_LESSONS" | "MODULE" | "COURSE";

type MilestoneChest = {
  kind: MilestoneChestKind;
  available: boolean;
  availableCount: number;
  nextSourceId: string | null;
  progress: number;
  target: number;
  claimed: boolean;
};

export type MilestoneChestState = {
  completedLessons: number;
  chests: MilestoneChest[];
};

export type OpenedMilestoneChest = {
  kind: MilestoneChestKind;
  sourceId: string;
  experience: number;
  waterLilies: number;
  openedAt: Date;
};

export const MILESTONE_CHEST_REWARDS: Record<MilestoneChestKind, { experience: number; waterLilies: number }> = {
  FIRST_STEPS: { experience: 300, waterLilies: 1 },
  LESSON_3: { experience: 500, waterLilies: 2 },
  LESSON_7: { experience: 1500, waterLilies: 5 },
  LESSON_9: { experience: 2000, waterLilies: 7 },
  EVERY_3_LESSONS: { experience: 500, waterLilies: 2 },
  EVERY_7_LESSONS: { experience: 1500, waterLilies: 5 },
  EVERY_9_LESSONS: { experience: 2000, waterLilies: 7 },
  EVERY_12_LESSONS: { experience: 3000, waterLilies: 12 },
  MODULE: { experience: 3000, waterLilies: 12 },
  COURSE: { experience: 3000, waterLilies: 12 },
};

const MILESTONE_CHEST_SOURCE_TYPE: Record<MilestoneChestKind, string> = {
  FIRST_STEPS: "MILESTONE_CHEST_FIRST_STEPS",
  LESSON_3: "MILESTONE_CHEST_3_LESSONS",
  LESSON_7: "MILESTONE_CHEST_FIRST_7_LESSONS",
  LESSON_9: "MILESTONE_CHEST_FIRST_9_LESSONS",
  EVERY_3_LESSONS: "MILESTONE_CHEST_EVERY_3_LESSONS",
  EVERY_7_LESSONS: "MILESTONE_CHEST_7_LESSONS",
  EVERY_9_LESSONS: "MILESTONE_CHEST_EVERY_9_LESSONS",
  EVERY_12_LESSONS: "MILESTONE_CHEST_EVERY_12_LESSONS",
  MODULE: "MILESTONE_CHEST_MODULE",
  COURSE: "MILESTONE_CHEST_COURSE",
};

/** Already opened chests live in achievements, not in the upcoming-rewards rail. */
export async function listOpenedMilestoneChests(userId: string): Promise<OpenedMilestoneChest[]> {
  const sourceToKind = new Map(Object.entries(MILESTONE_CHEST_SOURCE_TYPE).map(([kind, sourceType]) => [sourceType, kind as MilestoneChestKind]));
  const claims = await prisma.experienceTransaction.findMany({
    where: { userId, sourceType: { in: [...sourceToKind.keys()] } },
    select: { sourceType: true, sourceId: true, amount: true, description: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  return claims.flatMap((claim) => {
    const kind = sourceToKind.get(claim.sourceType);
    if (!kind) return [];
    return [{ kind, sourceId: claim.sourceId, experience: claim.amount, waterLilies: Number(claim.description?.match(/water-lily:(\d+)/)?.[1] ?? 0), openedAt: claim.createdAt }];
  });
}
/** The multiplier wheel deliberately contains every tenth between 1.1 and
 * 3.0 exactly once. There are no hidden weights or "near miss" values. */
export const LESSON_XP_MULTIPLIER_MIN_STEP = 11;
export const LESSON_XP_MULTIPLIER_MAX_STEP = 30;
export const LESSON_XP_MULTIPLIER_STEP_COUNT = LESSON_XP_MULTIPLIER_MAX_STEP - LESSON_XP_MULTIPLIER_MIN_STEP + 1;

export type LessonXpMultiplierWheelResult = {
  available: boolean;
  spun: boolean;
  alreadySpun: boolean;
  baseExperience: number;
  multiplierStep: number | null;
  multiplier: number | null;
  bonusExperience: number;
  totalExperience: number;
};

type LessonXpMultiplierTransaction = { amount: number; description: string | null };

function selectLessonXpMultiplierStep() {
  // This is intentionally an unweighted, uniform Math.random() selection.
  // It executes only on the server; the browser cannot submit a multiplier.
  return LESSON_XP_MULTIPLIER_MIN_STEP + Math.floor(Math.random() * LESSON_XP_MULTIPLIER_STEP_COUNT);
}

function multiplierWheelResultFromTransaction(transaction: LessonXpMultiplierTransaction, currentBaseExperience: number): LessonXpMultiplierWheelResult {
  const step = Number(transaction.description?.match(/\bstep:(\d{2})\b/)?.[1]);
  const storedBase = Number(transaction.description?.match(/\bbase:(\d+)\b/)?.[1]);
  const multiplierStep = Number.isInteger(step) && step >= 10 && step <= LESSON_XP_MULTIPLIER_MAX_STEP
    ? step
    : LESSON_XP_MULTIPLIER_MIN_STEP;
  const baseExperience = Number.isSafeInteger(storedBase) && storedBase >= 0 ? storedBase : currentBaseExperience;
  const credited = creditedLessonWheelXp(baseExperience, transaction.amount);

  return {
    available: true,
    spun: false,
    alreadySpun: true,
    baseExperience: credited.baseExperience,
    multiplierStep,
    multiplier: multiplierStep / 10,
    bonusExperience: credited.bonusExperience,
    totalExperience: credited.totalExperience,
  };
}

type ChestRewardContext = { difficulty: number; currentStreak: number; chestLevel: number; userLevel: number; localDate: string };

/**
 * Chest XP is calculated server-side from the latest completed task's
 * difficulty, the chest's level and the current daily streak. This preserves
 * a visible, bounded reward curve rather than allowing unexplained hundreds
 * of XP to appear from a client-side animation.
 */
async function chestRewardContext(tx: Prisma.TransactionClient, userId: string, chestLevel: number): Promise<ChestRewardContext> {
  const [streak, attempts, user, level] = await Promise.all([
    tx.userStreak.findUnique({ where: { userId }, select: { currentStreak: true } }),
    tx.exerciseAttempt.findMany({
      where: { userId, isCorrect: true },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { exercise: { select: { difficulty: true } } },
    }),
    tx.user.findUnique({ where: { id: userId }, select: { timeZone: true } }),
    tx.userLevel.findUnique({ where: { userId }, select: { level: true } }),
  ]);
  const meanDifficulty = attempts.length
    ? attempts.reduce((sum, attempt) => sum + attempt.exercise.difficulty, 0) / attempts.length
    : 1;
  return {
    difficulty: Math.max(1, Math.min(5, Math.round(meanDifficulty))),
    currentStreak: Math.max(0, streak?.currentStreak ?? 0),
    chestLevel: Math.max(1, Math.min(403, chestLevel)),
    userLevel: Math.max(1, level?.level ?? 1),
    localDate: userLocalDate(user?.timeZone),
  };
}

type FlowerChestRewardChoice = EconomyBonusReward & {
  flower: FlowerChestDefinition;
};

function flowerIdFromDescription(description: string | null | undefined) {
  return description?.match(/\bflower:([a-z-]+)\b/)?.[1] ?? null;
}

async function randomStreakChestReward(tx: Prisma.TransactionClient, userId: string, milestone: number, context: ChestRewardContext): Promise<FlowerChestRewardChoice> {
  const [recentRewards, previousJackpot, previousFlower] = await Promise.all([
    tx.experienceTransaction.findMany({
      where: { userId, sourceType: "STREAK_CHEST", localDate: context.localDate },
      orderBy: { createdAt: "desc" },
      take: 500,
      select: { amount: true },
    }),
    tx.experienceTransaction.findFirst({
      where: { userId, sourceType: "STREAK_CHEST", amount: { in: [...STREAK_CHEST_JACKPOT_VALUES] } },
      orderBy: { createdAt: "desc" },
      select: { amount: true },
    }),
    tx.experienceTransaction.findFirst({
      where: { userId, sourceType: { in: ["STREAK_CHEST", "MISTAKE_REVIEW_CHEST", "MISTAKE_ACHIEVEMENT"] }, description: { contains: "flower:" } },
      orderBy: { createdAt: "desc" },
      select: { description: true },
    }),
  ]);
  // Every chest keeps its own weighted flower drop. The separate Water Lily
  // inventory reward is attached below and never replaces this flower.
  const flower = selectRandomFlowerChest(flowerIdFromDescription(previousFlower?.description), randomInt);
  const standardExperience = selectStreakChestExperience({
    ceiling: streakChestExperienceCeiling({
      milestone,
      chestLevel: context.chestLevel,
      difficulty: context.difficulty,
      dailyStreak: context.currentStreak,
      userLevel: context.userLevel,
    }),
    previous: recentRewards[0]?.amount ?? null,
    previousJackpot: previousJackpot?.amount ?? null,
    dailyCounts: streakChestDailyCounts(recentRewards.map((reward) => reward.amount)),
    isCenturyMilestone: isCenturyStreakChest(milestone),
  });
  // A century streak continues to unlock its separate non-ranked KRIN Coin,
  // but cannot make a common flower imitate a rare flower's chest. Every XP
  // result is clamped to the selected flower's own natural-rarity band.
  const experience = isWhiteLily(flower)
    ? 1_000
    : Math.max(flower.minimumExperience, Math.min(flower.maximumExperience, standardExperience));
  return {
    id: `flower-${flower.id}-xp-${experience}`,
    flower,
    experience,
    hintCredits: flower.hintCredits,
    translationCredits: flower.translationCredits,
  };
}

/**
 * The unique idempotency key prevents a duplicate claim for one chest. This
 * transaction-scoped PostgreSQL lock additionally serializes different chest
 * claims for the same learner and calendar day, so racing browser tabs cannot
 * both see unused medium-tier daily XP capacity before either reward is
 * recorded.
 */
async function lockStreakChestDay(tx: Prisma.TransactionClient, userId: string, localDate: string) {
  await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${`streak-chest:${userId}:${localDate}`}))`);
}

/** Serialize a learner's flower pool across all milestones. This makes both
 * guarantees strict under racing tabs: no repeated flower and exactly one
 * Water Lily inventory item per 50-answer cycle. */
async function lockFlowerChestPool(tx: Prisma.TransactionClient, userId: string) {
  await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${`flower-chest:${userId}`}))`);
}

function streakChestResultFromExisting(existing: NonNullable<Awaited<ReturnType<typeof existingChestReward>>>) {
  return {
    ...existing,
    rewardId: existing.rewardId?.match(/streak chest:([^\s]+)/)?.[1] ?? existing.rewardId,
  };
}

async function existingChestReward(tx: Prisma.TransactionClient, userId: string, idempotencyKey: string, sourceType: string, sourceId: string) {
  const [existing, coin, fractionalCoin] = await Promise.all([
    tx.experienceTransaction.findUnique({ where: { idempotencyKey }, select: { amount: true, description: true } }),
    tx.coinTransaction.findUnique({ where: { idempotencyKey }, select: { amount: true } }),
    tx.coinTransaction.findUnique({ where: { idempotencyKey: `fractional-krin:${idempotencyKey}` }, select: { amountMinor: true } }),
  ]);
  if (!existing) return null;
  const bonuses = await tx.learningBonusTransaction.findMany({
    where: { userId, sourceType, sourceId, amount: { gt: 0 } },
    select: { kind: true, amount: true },
  });
  return {
    opened: false,
    alreadyOpened: true,
    // Keep the original reward identifier intact for legacy audit entries.
    rewardId: existing.description?.split("|")[0]?.split(":").slice(1).join(":").trim() || null,
    experience: existing.amount,
    coins: (coin?.amount ?? 0) + (fractionalCoin?.amountMinor ?? 0) / 100 + Number(existing.description?.match(/xp-coins:(\d+)/)?.[1] ?? 0) / 100,
    flowerId: flowerIdFromDescription(existing.description),
    firstDiscovery: false,
    waterLily: Number(existing.description?.match(/water-lily:(\d+)/)?.[1] ?? 0),
    hintCredits: bonuses.filter((bonus) => bonus.kind === "HINT").reduce((sum, bonus) => sum + bonus.amount, 0),
    translationCredits: bonuses.filter((bonus) => bonus.kind === "TRANSLATION").reduce((sum, bonus) => sum + bonus.amount, 0),
  };
}

function activeItem(itemId: string) {
  return SHOP_ITEMS.find((item) => item.id === itemId) ?? null;
}

function discountCode() {
  return `KRIN-${randomUUID().replace(/-/g, "").toUpperCase()}`;
}

function couponFromDescription(description: string | null) {
  const match = description?.match(/coupon:([A-Z0-9-]+)/);
  return match?.[1] ?? null;
}

function ownedItemIds(transactions: Array<{ sourceId: string }>) {
  return new Set(transactions.map((transaction) => transaction.sourceId));
}

export async function getDailyChestState(userId: string, browserTimeZone?: string | null) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { dailyChestClaimedAt: true, dailyChestTimeZone: true, timeZone: true } });
  if (!user) throw new Error("User not found");
  let timeZone = selectedChestTimeZone(user.timeZone, user.dailyChestTimeZone, browserTimeZone);
  if (!user.dailyChestTimeZone && (user.timeZone !== "UTC" || browserChestTimeZone(browserTimeZone))) {
    await prisma.user.updateMany({ where: { id: userId, dailyChestTimeZone: null }, data: { dailyChestTimeZone: timeZone } });
    const pinned = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { dailyChestTimeZone: true } });
    timeZone = pinned.dailyChestTimeZone ?? timeZone;
  }
  const now = new Date();
  const lessonToday = await prisma.userDailyActivity.findUnique({ where: { userId_date: { userId, date: userLocalDate(timeZone, now) } }, select: { lessonsCompleted: true } });
  const lessonRequired = !lessonToday?.lessonsCompleted;
  const available = !lessonRequired && dailyChestAvailable(user.dailyChestClaimedAt, timeZone, now);
  return { available, lessonRequired, nextAt: dailyChestAvailable(user.dailyChestClaimedAt, timeZone, now) ? null : nextDailyChestAt(timeZone, now) };
}

/** Claim state changes before reward creation inside one transaction. The
 * per-user transaction lock prevents two tabs from claiming the same local
 * calendar day. The chest time zone is pinned for later device changes. */
export async function openDailyChest(userId: string, browserTimeZone?: string | null) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${`daily-chest:${userId}`}))`);
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { dailyChestClaimedAt: true, dailyChestTimeZone: true, timeZone: true } });
    const timeZone = selectedChestTimeZone(user.timeZone, user.dailyChestTimeZone, browserTimeZone);
    if (!user.dailyChestTimeZone) await tx.user.update({ where: { id: userId }, data: { dailyChestTimeZone: timeZone } });
    const now = new Date();
    const nextAt = nextDailyChestAt(timeZone, now);
    if (!dailyChestAvailable(user.dailyChestClaimedAt, timeZone, now)) {
      return { opened: false, experience: 0, coins: 0, waterLily: 0, hintCredits: 0, translationCredits: 0, nextAt };
    }
    const activity = await tx.userDailyActivity.findUnique({ where: { userId_date: { userId, date: userLocalDate(timeZone, now) } }, select: { lessonsCompleted: true } });
    if (!activity?.lessonsCompleted) throw new Error("Complete one lesson today to open the daily chest.");
    await tx.user.update({ where: { id: userId }, data: { dailyChestClaimedAt: now } });
    const reward = await grantEconomyReward(tx, {
      userId,
      experience: 500,
      sourceType: "DAILY_CHEST",
      sourceId: now.toISOString(),
      idempotencyKey: `daily-chest:${userId}:${now.getTime()}`,
      description: "Daily lesson chest | water-lily:3",
    });
    if (reward.awarded) await tx.userStreak.upsert({ where: { userId }, create: { userId, waterLilyCount: 3 }, update: { waterLilyCount: { increment: 3 } } });
    return { opened: reward.awarded, experience: reward.experience, coins: reward.coins, waterLily: reward.awarded ? 3 : 0, hintCredits: 0, translationCredits: 0, nextAt };
  });
}

/**
 * A chest is created only by a real correct-answer streak checkpoint. The
 * client may choose when to open it, but cannot forge a checkpoint or claim
 * it twice: the server verifies the learner's best streak and uses an
 * immutable idempotency key for every milestone.
 */
export async function openStreakChest(userId: string, rawMilestone: number) {
  if (!Number.isSafeInteger(rawMilestone) || rawMilestone < 3 || !correctAnswerStreak(rawMilestone).activated) {
    throw new Error("This streak chest is unavailable.");
  }
  const milestone = rawMilestone;

  return prisma.$transaction(async (tx) => {
    const level = await tx.userLevel.findUnique({
      where: { userId },
      select: { bestCorrectStreak: true },
    });
    if (!level || level.bestCorrectStreak < milestone) {
      throw new Error("Reach this streak to open the chest.");
    }

    const idempotencyKey = `streak-chest:${userId}:${milestone}`;
    const existing = await existingChestReward(tx, userId, idempotencyKey, "STREAK_CHEST", String(milestone));
    if (existing) return {
      ...streakChestResultFromExisting(existing),
      questBook: await getStreakQuestBookForSource(tx, userId, milestone),
    };

    const chestLevel = streakChestLevel(milestone);
    if (!chestLevel) throw new Error("This streak chest is unavailable.");
    const context = await chestRewardContext(tx, userId, chestLevel);
    await lockStreakChestDay(tx, userId, context.localDate);
    await lockFlowerChestPool(tx, userId);

    // The first read happened before waiting for the per-day lock. Check once
    // more after acquiring it so a request that finished in another tab is
    // returned as the original verified reward instead of looking like 0 XP.
    const claimedWhileWaiting = await existingChestReward(tx, userId, idempotencyKey, "STREAK_CHEST", String(milestone));
    if (claimedWhileWaiting) return {
      ...streakChestResultFromExisting(claimedWhileWaiting),
      questBook: await getStreakQuestBookForSource(tx, userId, milestone),
    };

    const choice = await randomStreakChestReward(tx, userId, milestone, context);
    const previouslyOwnedFlower = await tx.experienceTransaction.findFirst({
      where: { userId, sourceType: { in: ["STREAK_CHEST", "MISTAKE_REVIEW_CHEST", "MISTAKE_ACHIEVEMENT"] }, description: { contains: `flower:${choice.flower.id}` } },
      select: { id: true },
    });
    const allowsLegendaryExperience = isWhiteLily(choice.flower);
    if (!Number.isSafeInteger(choice.experience) || choice.experience < STREAK_CHEST_XP_MINIMUM || (!allowsLegendaryExperience && choice.experience > STREAK_CHEST_XP_MAXIMUM) || (allowsLegendaryExperience && choice.experience !== 1_000)) {
      throw new Error("Invalid streak chest reward.");
    }
    const waterLilyCycle = flowerRestoreCycle(milestone);
    const waterLilyAlreadyAwarded = await tx.experienceTransaction.findFirst({
      where: {
        userId,
        sourceType: "STREAK_CHEST",
        description: { contains: `water-lily-cycle:${waterLilyCycle}` },
      },
      select: { id: true },
    });
    // The primary flower ledger doubles as the immutable receipt for the
    // accompanying Water Lily. The check runs while holding the per-user
    // advisory lock, so two tabs cannot mint a second item in one cycle.
    const waterLily = waterLilyAlreadyAwarded ? 0 : 1;
    const reward = await grantEconomyReward(tx, {
      userId,
      experience: choice.experience,
      // A real, non-ranked KRIN Coin is awarded at each century checkpoint.
      krinCoins: streakChestKrinCoinReward(milestone),
      krinCoinMinor: choice.flower.krinCoinMinor,
      hintCredits: choice.hintCredits,
      translationCredits: choice.translationCredits,
      sourceType: "STREAK_CHEST",
      sourceId: String(milestone),
      idempotencyKey,
      description: `Streak flower chest:${choice.id} | flower:${choice.flower.id}${waterLily ? ` | water-lily-cycle:${waterLilyCycle} | water-lily:1` : ""}`,
    });
    if (!reward.awarded) {
      // This is defensive against a legacy/retry race: never show a newly
      // opened chest with zero XP when its immutable ledger entry exists.
      const verifiedReward = await existingChestReward(tx, userId, idempotencyKey, "STREAK_CHEST", String(milestone));
      if (verifiedReward) return {
        ...streakChestResultFromExisting(verifiedReward),
        questBook: await getStreakQuestBookForSource(tx, userId, milestone),
      };
      throw new Error("The streak chest reward could not be verified.");
    }
    if (waterLily) {
      // A Water Lily is inventory, not an automatic freeze. Its consumption
      // is validated by the server-owned streak-recovery service.
      await tx.userStreak.upsert({
        where: { userId },
        create: { userId, waterLilyCount: 1 },
        update: { waterLilyCount: { increment: 1 } },
      });
    }
    const questBook = await maybeDropStreakQuestBook(tx, userId, milestone, {
      dropDenominator: choice.flower.questBookDenominator ?? undefined,
      guaranteed: isWhiteLily(choice.flower),
    });
    return {
      opened: reward.awarded,
      alreadyOpened: false,
      rewardId: choice.id,
      flowerId: choice.flower.id,
      firstDiscovery: !previouslyOwnedFlower,
      waterLily,
      experience: reward.experience,
      coins: reward.coins,
      hintCredits: reward.hintCredits,
      translationCredits: reward.translationCredits,
      questBook,
    };
  });
}

function milestoneChestKey(kind: MilestoneChestKind, sourceId: string) {
  return `${MILESTONE_CHEST_SOURCE_TYPE[kind]}:${sourceId}`;
}

async function completedModuleTargets(userId: string) {
  const modules = await prisma.courseModule.findMany({
    where: {
      isPublished: true,
      course: { isPublished: true, isTemplate: false },
      lessons: { some: { isPublished: true } },
    },
    select: {
      id: true,
      courseId: true,
      lessons: {
        where: { isPublished: true },
        select: { progress: { where: { userId, status: "COMPLETED" }, select: { id: true } } },
      },
    },
  });
  return modules.filter((module) => module.lessons.length > 0 && module.lessons.every((lesson) => lesson.progress.length > 0));
}

/**
 * The milestone state is derived from immutable lesson completion records and
 * the reward ledger. There is no browser-owned counter to reset or tamper
 * with, and missed 7-lesson chests remain available until the learner opens
 * them.
 */
export async function getMilestoneChestState(userId: string): Promise<MilestoneChestState> {
  const [completedLessons, completedModules, claims] = await Promise.all([
    prisma.lessonProgress.count({
      where: { userId, status: "COMPLETED", lesson: { isPublished: true, module: { isPublished: true, course: { isPublished: true, isTemplate: false } } } },
    }),
    completedModuleTargets(userId),
    prisma.experienceTransaction.findMany({
      where: { userId, sourceType: { in: Object.values(MILESTONE_CHEST_SOURCE_TYPE) } },
      select: { sourceType: true, sourceId: true },
    }),
  ]);
  const claimed = new Set(claims.map((claim) => `${claim.sourceType}:${claim.sourceId}`));
  const hasClaim = (kind: MilestoneChestKind, sourceId: string) => claimed.has(milestoneChestKey(kind, sourceId));

  const firstChest = (kind: MilestoneChestKind, target: number): MilestoneChest => {
    const claimedOnce = hasClaim(kind, String(target));
    const available = completedLessons >= target && !claimedOnce;
    return { kind, available, availableCount: available ? 1 : 0, nextSourceId: available ? String(target) : null, progress: Math.min(completedLessons, target), target, claimed: claimedOnce };
  };
  const repeatingChest = (kind: MilestoneChestKind, interval: number): MilestoneChest => {
    const thresholds = Array.from({ length: Math.floor(completedLessons / interval) }, (_, index) => (index + 1) * interval).filter((number) => number > 9);
    const unclaimed = thresholds.filter((number) => !hasClaim(kind, String(number)));
    const next = unclaimed[0] ?? Math.ceil(Math.max(10, completedLessons + 1) / interval) * interval;
    return { kind, available: unclaimed.length > 0, availableCount: unclaimed.length, nextSourceId: unclaimed.length ? String(unclaimed[0]) : null, progress: Math.min(completedLessons, next), target: next, claimed: false };
  };

  const unclaimedModules = completedModules.filter((module) => !hasClaim("MODULE", module.id));
  const completedCourseIds = [...new Set(completedModules.map((module) => module.courseId))].filter((courseId) => {
    const courseModules = completedModules.filter((module) => module.courseId === courseId);
    return courseModules.length > 0;
  });
  // A course chest opens only once every published module in that course has
  // been completed. Query the module count instead of trusting a page route.
  const completedCourses = await prisma.course.findMany({
    where: {
      id: { in: completedCourseIds },
      isPublished: true,
      isTemplate: false,
      modules: {
        every: {
          OR: [
            { isPublished: false },
            { lessons: { none: { isPublished: true } } },
            { lessons: { every: { OR: [{ isPublished: false }, { progress: { some: { userId, status: "COMPLETED" } } }] } } },
          ],
        },
      },
    },
    select: { id: true },
  });
  const unclaimedCourses = completedCourses.filter((course) => !hasClaim("COURSE", course.id));

  return {
    completedLessons,
    chests: [
      firstChest("FIRST_STEPS", 1),
      firstChest("LESSON_3", 3),
      firstChest("LESSON_7", 7),
      firstChest("LESSON_9", 9),
      { kind: "MODULE", available: unclaimedModules.length > 0, availableCount: unclaimedModules.length, nextSourceId: unclaimedModules[0]?.id ?? null, progress: completedModules.length, target: completedModules.length + (unclaimedModules.length ? 0 : 1), claimed: false },
      { kind: "COURSE", available: unclaimedCourses.length > 0, availableCount: unclaimedCourses.length, nextSourceId: unclaimedCourses[0]?.id ?? null, progress: completedCourses.length, target: completedCourses.length + (unclaimedCourses.length ? 0 : 1), claimed: false },
      repeatingChest("EVERY_3_LESSONS", 3),
      repeatingChest("EVERY_7_LESSONS", 7),
      repeatingChest("EVERY_9_LESSONS", 9),
      repeatingChest("EVERY_12_LESSONS", 12),
    ],
  };
}

async function milestoneIsEligible(tx: Prisma.TransactionClient, userId: string, kind: MilestoneChestKind, sourceId: string) {
  const completedLessons = () => tx.lessonProgress.count({
    where: { userId, status: "COMPLETED", lesson: { isPublished: true, module: { isPublished: true, course: { isPublished: true, isTemplate: false } } } },
  });

  const firstMilestone = { FIRST_STEPS: 1, LESSON_3: 3, LESSON_7: 7, LESSON_9: 9 } as const;
  if (kind in firstMilestone) {
    const target = firstMilestone[kind as keyof typeof firstMilestone];
    return sourceId === String(target) && await completedLessons() >= target;
  }
  const repeatingInterval = { EVERY_3_LESSONS: 3, EVERY_7_LESSONS: 7, EVERY_9_LESSONS: 9, EVERY_12_LESSONS: 12 } as const;
  if (kind in repeatingInterval) {
    const threshold = Number(sourceId);
    return Number.isSafeInteger(threshold) && threshold > 9 && threshold % repeatingInterval[kind as keyof typeof repeatingInterval] === 0 && await completedLessons() >= threshold;
  }
  if (kind === "MODULE") {
    const courseModule = await tx.courseModule.findFirst({
      where: { id: sourceId, isPublished: true, course: { isPublished: true, isTemplate: false } },
      select: { lessons: { where: { isPublished: true }, select: { progress: { where: { userId, status: "COMPLETED" }, select: { id: true } } } } },
    });
    return Boolean(courseModule && courseModule.lessons.length > 0 && courseModule.lessons.every((lesson) => lesson.progress.length > 0));
  }
  const course = await tx.course.findFirst({ where: { id: sourceId, isPublished: true, isTemplate: false }, select: { id: true } });
  if (!course) return false;
  const [total, completed] = await Promise.all([
    tx.lesson.count({ where: { isPublished: true, module: { isPublished: true, courseId: course.id } } }),
    tx.lessonProgress.count({ where: { userId, status: "COMPLETED", lesson: { isPublished: true, module: { isPublished: true, courseId: course.id } } } }),
  ]);
  return total > 0 && completed >= total;
}

/** Opens one earned milestone chest. The source id is revalidated on the
 * server and the immutable key makes every threshold, module and course
 * claimable exactly once. */
export async function openMilestoneChest(userId: string, kind: MilestoneChestKind, sourceId: string) {
  const idempotencyKey = `milestone-chest:${userId}:${kind}:${sourceId}`;
  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await existingChestReward(tx, userId, idempotencyKey, MILESTONE_CHEST_SOURCE_TYPE[kind], sourceId);
      if (existing) return existing;
      if (!await milestoneIsEligible(tx, userId, kind, sourceId)) throw new Error("This chest has not been unlocked yet.");
      const rewardChoice = MILESTONE_CHEST_REWARDS[kind];
      const reward = await grantEconomyReward(tx, {
        userId,
        experience: rewardChoice.experience,
        sourceType: MILESTONE_CHEST_SOURCE_TYPE[kind],
        sourceId,
        idempotencyKey,
        description: `Milestone chest:${kind}:${sourceId} | water-lily:${rewardChoice.waterLilies}`,
      });
      if (reward.awarded) await tx.userStreak.upsert({ where: { userId }, create: { userId, waterLilyCount: rewardChoice.waterLilies }, update: { waterLilyCount: { increment: rewardChoice.waterLilies } } });
      return { opened: reward.awarded, alreadyOpened: false, experience: reward.experience, coins: reward.coins, waterLily: reward.awarded ? rewardChoice.waterLilies : 0, hintCredits: 0, translationCredits: 0 };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return prisma.$transaction(async (tx) => {
        const existing = await existingChestReward(tx, userId, idempotencyKey, MILESTONE_CHEST_SOURCE_TYPE[kind], sourceId);
        return existing ?? { opened: false, alreadyOpened: true, experience: 0, coins: 0, hintCredits: 0, translationCredits: 0, rewardId: null };
      });
    }
    throw error;
  }
}

export async function getShopState(userId: string) {
  const [user, wallet, streak, purchases] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { equippedShopTheme: true, equippedShopAvatar: true } }),
    prisma.userWallet.upsert({ where: { userId }, create: { userId }, update: {} }),
    prisma.userStreak.upsert({ where: { userId }, create: { userId }, update: {} }),
    // Store purchases and achievement unlocks use the same ownership surface.
    // An unlock has a zero ledger amount and therefore cannot be mistaken for
    // spendable KRIN Coins or a transaction that should affect ranking.
    prisma.coinTransaction.findMany({
      where: {
        userId,
        OR: [
          { sourceType: "SHOP_ITEM" },
          { sourceType: "ACHIEVEMENT_UNLOCK", amount: 0 },
          { sourceType: "SHOP_ITEM_USE", amount: 0 },
        ],
      },
      select: { sourceType: true, sourceId: true, description: true },
    }),
  ]);
  const owned = ownedItemIds(purchases);
  const coupons = purchases
    .filter((purchase) => purchase.sourceId === "premium-discount-10")
    .map((purchase) => couponFromDescription(purchase.description))
    .filter((code): code is string => Boolean(code));
  // The shop offers only five tiers, but older earned lilies of other
  // capacities still count toward a real lesson-streak restoration.
  const recoveryInventory = WATER_LILY_TIERS.map((tier) => ({
    id: tier.id, capacity: tier.capacity,
    quantity: tier.id === WATER_LILY_SHOP_ID ? streak.waterLilyCount : consumableQuantity(purchases, tier.id),
  }));
  return {
    balance: wallet.balance + wallet.fractionalBalance / 100,
    recoveryInventory,
    items: SHOP_ITEMS.map((item) => {
      const quantity = item.kind === "recovery"
        ? recoveryInventory.find((tier) => tier.id === item.id)?.quantity ?? 0
        : item.kind === "booster" ? consumableQuantity(purchases, item.id) : 0;
      return { ...item, owned: item.kind === "recovery" || item.kind === "booster" ? quantity > 0 : owned.has(item.id), quantity };
    }),
    equippedTheme: user.equippedShopTheme,
    equippedAvatar: user.equippedShopAvatar,
    coupons,
  };
}

export async function purchaseShopItem(userId: string, itemId: string, purchaseId?: string) {
  const item = activeItem(itemId);
  if (!item) throw new Error("This shop item is unavailable.");
  const consumable = item.kind === "recovery" || item.kind === "booster";

  return prisma.$transaction(async (tx) => {
    const idempotencyKey = consumable ? `shop-item:${userId}:${item.id}:${purchaseId ?? randomUUID()}` : `shop-item:${userId}:${item.id}`;
    const existing = await tx.coinTransaction.findUnique({ where: { idempotencyKey }, select: { description: true } });
    if (existing) return { purchased: false, alreadyOwned: true, coupon: couponFromDescription(existing.description), item: item.id };
    if (!consumable) {
      const unlocked = await tx.coinTransaction.findFirst({
        where: { userId, sourceType: "ACHIEVEMENT_UNLOCK", sourceId: item.id, amount: 0 },
        select: { id: true },
      });
      if (unlocked) return { purchased: false, alreadyOwned: true, coupon: null, item: item.id };
    }

    const wallet = await tx.userWallet.upsert({ where: { userId }, create: { userId }, update: {} });
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "UserWallet" WHERE "id" = ${wallet.id} FOR UPDATE`);
    const lockedWallet = await tx.userWallet.findUniqueOrThrow({ where: { id: wallet.id } });
    const priceMinor = Math.round(item.price * 100);
    const beforeMinor = lockedWallet.balance * 100 + lockedWallet.fractionalBalance;
    if (beforeMinor < priceMinor) throw new Error("Not enough KRIN Coins for this item.");
    const afterMinor = beforeMinor - priceMinor;
    await tx.userWallet.update({ where: { id: wallet.id }, data: {
      balance: Math.floor(afterMinor / 100), fractionalBalance: afterMinor % 100,
      lifetimeSpent: { increment: Math.floor(priceMinor / 100) },
    } });
    const updatedWallet = await tx.userWallet.findUniqueOrThrow({ where: { id: wallet.id }, select: { balance: true, fractionalBalance: true } });

    let coupon: string | null = null;
    if (item.kind === "discount") {
      coupon = discountCode();
      await tx.promotion.create({
        data: {
          code: coupon,
          type: "PERCENT",
          amount: item.value ?? 10,
          perUserLimit: 1,
          usageLimit: 1,
          isActive: true,
        },
      });
    }
    if (item.kind === "recovery" && item.id === WATER_LILY_SHOP_ID) {
      await tx.userStreak.upsert({
        where: { userId }, create: { userId, waterLilyCount: 1 }, update: { waterLilyCount: { increment: 1 } },
      });
    }

    await tx.coinTransaction.create({
      data: {
        userId,
        walletId: wallet.id,
        amount: -Math.floor(priceMinor / 100),
        amountMinor: -priceMinor,
        balanceBefore: lockedWallet.balance,
        balanceAfter: updatedWallet.balance,
        balanceBeforeMinor: beforeMinor,
        balanceAfterMinor: afterMinor,
        type: "PURCHASE",
        sourceType: "SHOP_ITEM",
        sourceId: item.id,
        idempotencyKey,
        localDate: new Date().toISOString().slice(0, 10),
        description: `Shop purchase: ${item.title}${coupon ? ` | coupon:${coupon}` : ""}`,
      },
    });
    return { purchased: true, alreadyOwned: false, coupon, item: item.id, balance: updatedWallet.balance + updatedWallet.fractionalBalance / 100 };
  }).catch((error: unknown) => {
    // A double purchase can race on the immutable transaction key. The losing
    // request is a normal "already owned" response rather than an error.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { purchased: false, alreadyOwned: true, coupon: null, item: item.id };
    }
    throw error;
  });
}

export async function equipShopItem(userId: string, itemId: string) {
  const item = activeItem(itemId);
  if (!item || (item.kind !== "theme" && item.kind !== "avatar")) throw new Error("This item cannot be equipped.");
  const purchase = await prisma.coinTransaction.findFirst({
    where: {
      userId,
      sourceId: item.id,
      OR: [
        { sourceType: "SHOP_ITEM", amount: { lt: 0 } },
        { sourceType: "ACHIEVEMENT_UNLOCK", amount: 0 },
      ],
    },
    select: { id: true },
  });
  if (!purchase) throw new Error("Buy this item before equipping it.");
  const user = await prisma.user.update({
    where: { id: userId },
    // Equipping an avatar is an explicit display choice. Keep a saved photo
    // intact so the learner can switch back to it later in profile settings.
    data: item.kind === "theme"
      ? { equippedShopTheme: item.id }
      : { equippedShopAvatar: item.id, avatarDisplayMode: "SHOP" },
    select: { equippedShopTheme: true, equippedShopAvatar: true, avatarDisplayMode: true },
  });
  return {
    equippedTheme: user.equippedShopTheme,
    equippedAvatar: user.equippedShopAvatar,
    avatarDisplayMode: user.avatarDisplayMode === "SHOP" ? "SHOP" : "PHOTO",
  };
}

async function lessonExperienceBeforeMultiplier(tx: Prisma.TransactionClient, userId: string, lessonId: string) {
  // Keep this calculation in the immutable ledger rather than trusting a
  // reward configured in the lesson editor. The multiplier is intentionally
  // not part of the queried types, so it can never multiply itself.
  const [completionCredits, boosterCredits, correctAttempts] = await Promise.all([
    tx.experienceTransaction.findMany({
      where: { userId, type: "LESSON_COMPLETED", sourceId: lessonId },
      select: { amount: true },
    }),
    tx.experienceTransaction.findMany({
      where: { userId, sourceType: "SHOP_XP_BOOST", sourceId: lessonId },
      select: { amount: true },
    }),
    tx.exerciseAttempt.findMany({
      where: { userId, lessonId, isCorrect: true },
      select: { exerciseId: true },
    }),
  ]);
  const exerciseIds = [...new Set(correctAttempts.map((attempt) => attempt.exerciseId))];
  if (!exerciseIds.length) return [...completionCredits, ...boosterCredits].reduce((total, transaction) => total + transaction.amount, 0);

  const exerciseCredits = await tx.experienceTransaction.findMany({
    where: { userId, type: "EXERCISE_CORRECT", sourceId: { in: exerciseIds } },
    select: { amount: true },
  });
  return [...completionCredits, ...boosterCredits, ...exerciseCredits].reduce((total, transaction) => total + transaction.amount, 0);
}

async function assertCompletedLessonAndGetBaseExperience(tx: Prisma.TransactionClient, userId: string, lessonId: string) {
  const progress = await tx.lessonProgress.findUnique({
    where: { userId_lessonId: { userId, lessonId } },
    select: { status: true },
  });
  if (progress?.status !== "COMPLETED") throw new Error("Finish the lesson before spinning the multiplier wheel.");
  return lessonExperienceBeforeMultiplier(tx, userId, lessonId);
}

function multiplierIdempotencyKey(userId: string, lessonId: string) {
  return `lesson-xp-multiplier:${userId}:${lessonId}`;
}

/** Returns the durable state as well as an already-spun outcome after reload.
 * A 0-XP practice run has no wheel because multiplying it cannot reward XP. */
export async function getLessonXpMultiplierWheelState(userId: string, lessonId: string): Promise<LessonXpMultiplierWheelResult> {
  const idempotencyKey = multiplierIdempotencyKey(userId, lessonId);
  return prisma.$transaction(async (tx) => {
    const baseExperience = await assertCompletedLessonAndGetBaseExperience(tx, userId, lessonId);
    const existing = await tx.experienceTransaction.findUnique({
      where: { idempotencyKey },
      select: { id: true, amount: true, description: true },
    });
    if (existing) {
      const compensation = existing.amount === 0 ? await tx.experienceTransaction.findUnique({ where: { idempotencyKey: `wheel-zero-fix:${existing.id}` }, select: { amount: true } }) : null;
      return multiplierWheelResultFromTransaction({ ...existing, amount: existing.amount + (compensation?.amount ?? 0) }, baseExperience);
    }
    return {
      available: baseExperience > 0,
      spun: false,
      alreadySpun: false,
      baseExperience,
      multiplierStep: null,
      multiplier: null,
      bonusExperience: 0,
      totalExperience: baseExperience,
    };
  });
}

/**
 * Roll and credit the lesson multiplier exactly once. The uniform roll is
 * server-owned and the immutable idempotency key prevents retries, duplicate
 * tabs, or modified browser requests from awarding it a second time.
 */
export async function spinLessonXpMultiplierWheel(userId: string, lessonId: string): Promise<LessonXpMultiplierWheelResult> {
  const idempotencyKey = multiplierIdempotencyKey(userId, lessonId);
  return prisma.$transaction(async (tx) => {
    const baseExperience = await assertCompletedLessonAndGetBaseExperience(tx, userId, lessonId);
    const existing = await tx.experienceTransaction.findUnique({
      where: { idempotencyKey },
      select: { id: true, amount: true, description: true },
    });
    if (existing) {
      const compensation = existing.amount === 0 ? await tx.experienceTransaction.findUnique({ where: { idempotencyKey: `wheel-zero-fix:${existing.id}` }, select: { amount: true } }) : null;
      return multiplierWheelResultFromTransaction({ ...existing, amount: existing.amount + (compensation?.amount ?? 0) }, baseExperience);
    }
    if (baseExperience <= 0) {
      return {
        available: false,
        spun: false,
        alreadySpun: false,
        baseExperience,
        multiplierStep: null,
        multiplier: null,
        bonusExperience: 0,
        totalExperience: baseExperience,
      };
    }

    const multiplierStep = selectLessonXpMultiplierStep();
    const { bonusExperience, totalExperience } = lessonWheelXp(baseExperience, multiplierStep);
    const awarded = await grantEconomyReward(tx, {
      userId,
      experience: bonusExperience,
      sourceType: "LESSON_XP_MULTIPLIER",
      sourceId: lessonId,
      idempotencyKey,
      description: `Lesson XP multiplier | step:${multiplierStep} | base:${baseExperience} | total:${totalExperience}`,
    });
    return {
      available: true,
      spun: awarded.awarded,
      alreadySpun: false,
      baseExperience,
      multiplierStep,
      multiplier: multiplierStep / 10,
      bonusExperience: awarded.experience,
      totalExperience: baseExperience + awarded.experience,
    };
  }).catch(async (error: unknown) => {
    // A second concurrent POST loses the unique ledger race. Treat it as the
    // first spin's durable result, not as a chance to roll again.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return getLessonXpMultiplierWheelState(userId, lessonId);
    }
    throw error;
  });
}
