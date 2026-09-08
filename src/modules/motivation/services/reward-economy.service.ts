import { randomInt, randomUUID } from "crypto";
import { Prisma } from "@/generated/prisma-client-payments-runtime";
import { prisma } from "@/core/server/prisma";
import { grantEconomyReward } from "./motivation.service";
import { correctAnswerStreak } from "@/modules/motivation/utils/correct-answer-streak";

type ShopItemKind = "theme" | "avatar" | "discount";

export type ShopItem = {
  id: string;
  kind: ShopItemKind;
  price: number;
  title: string;
  description: string;
  value?: number;
};

/** All prices and effects live on the server. Never accept them from a form. */
export const SHOP_ITEMS: readonly ShopItem[] = [
  { id: "theme-aurora", kind: "theme", price: 4, title: "Aurora theme", description: "A calm violet-and-mint workspace theme." },
  { id: "theme-sunrise", kind: "theme", price: 4, title: "Sunrise theme", description: "A warm, high-contrast workspace theme." },
  { id: "avatar-fox", kind: "avatar", price: 3, title: "Fox avatar", description: "A curious fox for your learner profile." },
  { id: "avatar-owl", kind: "avatar", price: 3, title: "Owl avatar", description: "A focused night-owl learner avatar." },
  { id: "premium-discount-10", kind: "discount", price: 12, title: "10% Premium or Pro discount", description: "One personal code for a future Premium or Pro checkout.", value: 10 },
] as const;

const DAILY_CHEST_COOLDOWN_MS = 24 * 60 * 60 * 1_000;
type EconomyBonusReward = {
  id: string;
  experience: number;
  coins: number;
  hintCredits: number;
  translationCredits: number;
};

const DAILY_CHEST_REWARDS: readonly EconomyBonusReward[] = [
  { id: "xp-20", experience: 20, coins: 0, hintCredits: 0, translationCredits: 0 },
  { id: "xp-40", experience: 40, coins: 0, hintCredits: 0, translationCredits: 0 },
  { id: "xp-60", experience: 60, coins: 0, hintCredits: 0, translationCredits: 0 },
  { id: "xp-80", experience: 80, coins: 0, hintCredits: 0, translationCredits: 0 },
  { id: "xp-100", experience: 100, coins: 0, hintCredits: 0, translationCredits: 0 },
] as const;

/** A streak chest always awards one of the three learning-reward types. */
const STREAK_CHEST_REWARDS = [
  { id: "violet-xp", experience: 15, coins: 0, hintCredits: 0, translationCredits: 0 },
  { id: "yellow-hint-xp", experience: 8, coins: 0, hintCredits: 1, translationCredits: 0 },
  { id: "blue-translation-xp", experience: 8, coins: 0, hintCredits: 0, translationCredits: 1 },
] as const satisfies readonly EconomyBonusReward[];

export type MilestoneChestKind = "LESSON_3" | "EVERY_7_LESSONS" | "MODULE" | "COURSE";

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

const MILESTONE_CHEST_REWARDS: Record<MilestoneChestKind, readonly EconomyBonusReward[]> = {
  LESSON_3: [
    { id: "xp-150", experience: 150, coins: 0, hintCredits: 0, translationCredits: 0 },
    { id: "xp-180", experience: 180, coins: 0, hintCredits: 0, translationCredits: 0 },
    { id: "xp-220", experience: 220, coins: 0, hintCredits: 1, translationCredits: 0 },
  ],
  EVERY_7_LESSONS: [
    { id: "xp-300", experience: 300, coins: 1, hintCredits: 0, translationCredits: 0 },
    { id: "xp-360", experience: 360, coins: 1, hintCredits: 1, translationCredits: 0 },
    { id: "xp-420", experience: 420, coins: 1, hintCredits: 0, translationCredits: 1 },
  ],
  MODULE: [
    { id: "xp-600", experience: 600, coins: 2, hintCredits: 1, translationCredits: 0 },
    { id: "xp-750", experience: 750, coins: 2, hintCredits: 0, translationCredits: 1 },
    { id: "xp-900", experience: 900, coins: 2, hintCredits: 1, translationCredits: 1 },
  ],
  COURSE: [
    { id: "xp-1200", experience: 1200, coins: 3, hintCredits: 1, translationCredits: 1 },
    { id: "xp-1500", experience: 1500, coins: 3, hintCredits: 2, translationCredits: 1 },
    { id: "xp-1800", experience: 1800, coins: 3, hintCredits: 1, translationCredits: 2 },
  ],
};

const MILESTONE_CHEST_SOURCE_TYPE: Record<MilestoneChestKind, string> = {
  LESSON_3: "MILESTONE_CHEST_3_LESSONS",
  EVERY_7_LESSONS: "MILESTONE_CHEST_7_LESSONS",
  MODULE: "MILESTONE_CHEST_MODULE",
  COURSE: "MILESTONE_CHEST_COURSE",
};
const WHEEL_REWARDS = [
  { id: "xp-15", experience: 15, coins: 0, hintCredits: 0, translationCredits: 0 },
  { id: "xp-25", experience: 25, coins: 0, hintCredits: 0, translationCredits: 0 },
  { id: "coin-1", experience: 10, coins: 1, hintCredits: 0, translationCredits: 0 },
  { id: "hint-credit", experience: 10, coins: 0, hintCredits: 1, translationCredits: 0 },
  { id: "translation-credit", experience: 10, coins: 0, hintCredits: 0, translationCredits: 1 },
  { id: "xp-60", experience: 60, coins: 0, hintCredits: 0, translationCredits: 0 },
] as const;

function activeItem(itemId: string) {
  return SHOP_ITEMS.find((item) => item.id === itemId) ?? null;
}

function nextChestAt(claimedAt: Date | null) {
  return claimedAt ? new Date(claimedAt.getTime() + DAILY_CHEST_COOLDOWN_MS) : null;
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

export async function getDailyChestState(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { dailyChestClaimedAt: true } });
  if (!user) throw new Error("User not found");
  const nextAt = nextChestAt(user.dailyChestClaimedAt);
  return { available: !nextAt || nextAt.getTime() <= Date.now(), nextAt };
}

/** Claim state changes before reward creation inside one transaction. The
 * conditional UPDATE gives the exact 24-hour cooldown an atomic database
 * guard, including against two browser tabs being opened at once. */
export async function openDailyChest(userId: string) {
  const now = new Date();
  const eligibleBefore = new Date(now.getTime() - DAILY_CHEST_COOLDOWN_MS);
  const rewardChoice = DAILY_CHEST_REWARDS[randomInt(DAILY_CHEST_REWARDS.length)];

  return prisma.$transaction(async (tx) => {
    const claimed = await tx.user.updateMany({
      where: { id: userId, OR: [{ dailyChestClaimedAt: null }, { dailyChestClaimedAt: { lte: eligibleBefore } }] },
      data: { dailyChestClaimedAt: now },
    });
    if (!claimed.count) {
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { dailyChestClaimedAt: true } });
      return { opened: false, experience: 0, coins: 0, hintCredits: 0, translationCredits: 0, nextAt: nextChestAt(user.dailyChestClaimedAt) };
    }
    const reward = await grantEconomyReward(tx, {
      userId,
      experience: rewardChoice.experience,
      coins: rewardChoice.coins,
      hintCredits: rewardChoice.hintCredits,
      translationCredits: rewardChoice.translationCredits,
      sourceType: "DAILY_CHEST",
      sourceId: now.toISOString(),
      idempotencyKey: `daily-chest:${userId}:${now.getTime()}`,
      description: `Daily Mystery Box:${rewardChoice.id}`,
    });
    return { opened: reward.awarded, experience: reward.experience, coins: reward.coins, hintCredits: reward.hintCredits, translationCredits: reward.translationCredits, nextAt: new Date(now.getTime() + DAILY_CHEST_COOLDOWN_MS) };
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
    const existing = await tx.experienceTransaction.findUnique({
      where: { idempotencyKey },
      select: { amount: true, description: true },
    });
    if (existing) {
      const bonuses = await tx.learningBonusTransaction.findMany({
        where: { userId, sourceType: "STREAK_CHEST", sourceId: String(milestone), amount: { gt: 0 } },
        select: { kind: true, amount: true },
      });
      return {
        opened: false,
        alreadyOpened: true,
        rewardId: existing.description?.match(/streak chest:([^\s]+)/)?.[1] ?? null,
        experience: existing.amount,
        coins: 0,
        hintCredits: bonuses.filter((bonus) => bonus.kind === "HINT").reduce((sum, bonus) => sum + bonus.amount, 0),
        translationCredits: bonuses.filter((bonus) => bonus.kind === "TRANSLATION").reduce((sum, bonus) => sum + bonus.amount, 0),
      };
    }

    const choice = STREAK_CHEST_REWARDS[randomInt(STREAK_CHEST_REWARDS.length)];
    const reward = await grantEconomyReward(tx, {
      userId,
      experience: choice.experience,
      coins: choice.coins,
      hintCredits: choice.hintCredits,
      translationCredits: choice.translationCredits,
      sourceType: "STREAK_CHEST",
      sourceId: String(milestone),
      idempotencyKey,
      description: `Streak chest:${choice.id}`,
    });
    return {
      opened: reward.awarded,
      alreadyOpened: false,
      rewardId: choice.id,
      experience: reward.experience,
      coins: reward.coins,
      hintCredits: reward.hintCredits,
      translationCredits: reward.translationCredits,
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

  const starterClaimed = hasClaim("LESSON_3", "3");
  const sevenThresholds = Array.from({ length: Math.floor(completedLessons / 7) }, (_, index) => (index + 1) * 7);
  const unclaimedSevenThresholds = sevenThresholds.filter((threshold) => !hasClaim("EVERY_7_LESSONS", String(threshold)));
  const nextSevenThreshold = unclaimedSevenThresholds[0] ?? (sevenThresholds.at(-1) ?? 0) + 7;

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
      { kind: "LESSON_3", available: completedLessons >= 3 && !starterClaimed, availableCount: completedLessons >= 3 && !starterClaimed ? 1 : 0, nextSourceId: completedLessons >= 3 && !starterClaimed ? "3" : null, progress: Math.min(completedLessons, 3), target: 3, claimed: starterClaimed },
      { kind: "EVERY_7_LESSONS", available: unclaimedSevenThresholds.length > 0, availableCount: unclaimedSevenThresholds.length, nextSourceId: unclaimedSevenThresholds.length ? String(unclaimedSevenThresholds[0]) : null, progress: Math.min(completedLessons, nextSevenThreshold), target: nextSevenThreshold, claimed: false },
      { kind: "MODULE", available: unclaimedModules.length > 0, availableCount: unclaimedModules.length, nextSourceId: unclaimedModules[0]?.id ?? null, progress: completedModules.length, target: completedModules.length + (unclaimedModules.length ? 0 : 1), claimed: false },
      { kind: "COURSE", available: unclaimedCourses.length > 0, availableCount: unclaimedCourses.length, nextSourceId: unclaimedCourses[0]?.id ?? null, progress: completedCourses.length, target: completedCourses.length + (unclaimedCourses.length ? 0 : 1), claimed: false },
    ],
  };
}

async function milestoneIsEligible(tx: Prisma.TransactionClient, userId: string, kind: MilestoneChestKind, sourceId: string) {
  const completedLessons = () => tx.lessonProgress.count({
    where: { userId, status: "COMPLETED", lesson: { isPublished: true, module: { isPublished: true, course: { isPublished: true, isTemplate: false } } } },
  });

  if (kind === "LESSON_3") return sourceId === "3" && await completedLessons() >= 3;
  if (kind === "EVERY_7_LESSONS") {
    const threshold = Number(sourceId);
    return Number.isSafeInteger(threshold) && threshold >= 7 && threshold % 7 === 0 && await completedLessons() >= threshold;
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
      const existing = await tx.experienceTransaction.findUnique({ where: { idempotencyKey }, select: { id: true } });
      if (existing) return { opened: false, alreadyOpened: true, experience: 0, coins: 0, hintCredits: 0, translationCredits: 0 };
      if (!await milestoneIsEligible(tx, userId, kind, sourceId)) throw new Error("This chest has not been unlocked yet.");
      const rewardChoice = MILESTONE_CHEST_REWARDS[kind][randomInt(MILESTONE_CHEST_REWARDS[kind].length)];
      const reward = await grantEconomyReward(tx, {
        userId,
        experience: rewardChoice.experience,
        coins: rewardChoice.coins,
        hintCredits: rewardChoice.hintCredits,
        translationCredits: rewardChoice.translationCredits,
        sourceType: MILESTONE_CHEST_SOURCE_TYPE[kind],
        sourceId,
        idempotencyKey,
        description: `Milestone chest:${kind}:${rewardChoice.id}`,
      });
      return { opened: reward.awarded, alreadyOpened: false, experience: reward.experience, coins: reward.coins, hintCredits: reward.hintCredits, translationCredits: reward.translationCredits };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { opened: false, alreadyOpened: true, experience: 0, coins: 0, hintCredits: 0, translationCredits: 0 };
    }
    throw error;
  }
}

export async function getShopState(userId: string) {
  const [user, wallet, purchases] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { equippedShopTheme: true, equippedShopAvatar: true } }),
    prisma.userWallet.upsert({ where: { userId }, create: { userId }, update: {} }),
    prisma.coinTransaction.findMany({ where: { userId, sourceType: "SHOP_ITEM", amount: { lt: 0 } }, select: { sourceId: true, description: true } }),
  ]);
  const owned = ownedItemIds(purchases);
  const coupons = purchases
    .filter((purchase) => purchase.sourceId === "premium-discount-10")
    .map((purchase) => couponFromDescription(purchase.description))
    .filter((code): code is string => Boolean(code));
  return {
    balance: wallet.balance + wallet.fractionalBalance / 100,
    items: SHOP_ITEMS.map((item) => ({ ...item, owned: owned.has(item.id) })),
    equippedTheme: user.equippedShopTheme,
    equippedAvatar: user.equippedShopAvatar,
    coupons,
  };
}

export async function purchaseShopItem(userId: string, itemId: string) {
  const item = activeItem(itemId);
  if (!item) throw new Error("This shop item is unavailable.");

  return prisma.$transaction(async (tx) => {
    const idempotencyKey = `shop-item:${userId}:${item.id}`;
    const existing = await tx.coinTransaction.findUnique({ where: { idempotencyKey }, select: { description: true } });
    if (existing) return { purchased: false, alreadyOwned: true, coupon: couponFromDescription(existing.description), item: item.id };

    const wallet = await tx.userWallet.upsert({ where: { userId }, create: { userId }, update: {} });
    const debited = await tx.userWallet.updateMany({
      where: { id: wallet.id, balance: { gte: item.price } },
      data: { balance: { decrement: item.price }, lifetimeSpent: { increment: item.price } },
    });
    if (!debited.count) throw new Error("Not enough KRIN Coins for this item.");
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

    await tx.coinTransaction.create({
      data: {
        userId,
        walletId: wallet.id,
        amount: -item.price,
        balanceBefore: wallet.balance,
        balanceAfter: updatedWallet.balance,
        balanceBeforeMinor: wallet.balance * 100 + wallet.fractionalBalance,
        balanceAfterMinor: updatedWallet.balance * 100 + updatedWallet.fractionalBalance,
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
  const purchase = await prisma.coinTransaction.findUnique({ where: { idempotencyKey: `shop-item:${userId}:${item.id}` }, select: { id: true } });
  if (!purchase) throw new Error("Buy this item before equipping it.");
  const user = await prisma.user.update({
    where: { id: userId },
    data: item.kind === "theme" ? { equippedShopTheme: item.id } : { equippedShopAvatar: item.id },
    select: { equippedShopTheme: true, equippedShopAvatar: true },
  });
  return { equippedTheme: user.equippedShopTheme, equippedAvatar: user.equippedShopAvatar };
}

export async function spinLessonRewardWheel(userId: string, lessonId: string) {
  const reward = WHEEL_REWARDS[randomInt(WHEEL_REWARDS.length)];
  const idempotencyKey = `lesson-wheel:${userId}:${lessonId}`;
  return prisma.$transaction(async (tx) => {
    const progress = await tx.lessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
      select: { status: true },
    });
    if (progress?.status !== "COMPLETED") throw new Error("Finish the lesson before spinning the wheel.");
    const existing = await tx.experienceTransaction.findUnique({ where: { idempotencyKey }, select: { amount: true, description: true } });
    if (existing) {
      const coins = await tx.coinTransaction.findUnique({ where: { idempotencyKey }, select: { amount: true } });
      const bonusTransactions = await tx.learningBonusTransaction.findMany({ where: { userId, sourceType: "LESSON_WHEEL", sourceId: lessonId, amount: { gt: 0 } }, select: { kind: true, amount: true } });
      return {
        spun: false,
        alreadySpun: true,
        experience: existing.amount,
        coins: coins?.amount ?? 0,
        hintCredits: bonusTransactions.filter((item) => item.kind === "HINT").reduce((sum, item) => sum + item.amount, 0),
        translationCredits: bonusTransactions.filter((item) => item.kind === "TRANSLATION").reduce((sum, item) => sum + item.amount, 0),
        rewardId: existing.description?.match(/wheel:([^\s]+)/)?.[1] ?? null,
      };
    }
    const awarded = await grantEconomyReward(tx, {
      userId,
      experience: reward.experience,
      coins: reward.coins,
      hintCredits: reward.hintCredits,
      translationCredits: reward.translationCredits,
      sourceType: "LESSON_WHEEL",
      sourceId: lessonId,
      idempotencyKey,
      description: `Lesson wheel:${reward.id}`,
    });
    return { spun: awarded.awarded, alreadySpun: false, experience: awarded.experience, coins: awarded.coins, hintCredits: awarded.hintCredits, translationCredits: awarded.translationCredits, rewardId: reward.id };
  }).catch(async (error: unknown) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await prisma.experienceTransaction.findUnique({ where: { idempotencyKey }, select: { amount: true } });
      const coins = await prisma.coinTransaction.findUnique({ where: { idempotencyKey }, select: { amount: true } });
      if (existing) {
        const bonusTransactions = await prisma.learningBonusTransaction.findMany({ where: { userId, sourceType: "LESSON_WHEEL", sourceId: lessonId, amount: { gt: 0 } }, select: { kind: true, amount: true } });
        return {
          spun: false,
          alreadySpun: true,
          experience: existing.amount,
          coins: coins?.amount ?? 0,
          hintCredits: bonusTransactions.filter((item) => item.kind === "HINT").reduce((sum, item) => sum + item.amount, 0),
          translationCredits: bonusTransactions.filter((item) => item.kind === "TRANSLATION").reduce((sum, item) => sum + item.amount, 0),
          rewardId: null,
        };
      }
    }
    throw error;
  });
}
