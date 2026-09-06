import { randomInt, randomUUID } from "crypto";
import { Prisma } from "@/generated/prisma-client-payments-runtime";
import { prisma } from "@/core/server/prisma";
import { grantEconomyReward } from "./motivation.service";

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
const DAILY_CHEST_REWARDS = [50, 75, 100, 150, 250, 500] as const;
const WHEEL_REWARDS = [
  { id: "xp-15", experience: 15, coins: 0 },
  { id: "xp-25", experience: 25, coins: 0 },
  { id: "coin-1", experience: 0, coins: 1 },
  { id: "xp-40", experience: 40, coins: 0 },
  { id: "coin-2", experience: 0, coins: 2 },
  { id: "xp-60", experience: 60, coins: 0 },
] as const;

type Tx = Prisma.TransactionClient;

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
  const experience = DAILY_CHEST_REWARDS[randomInt(DAILY_CHEST_REWARDS.length)];

  return prisma.$transaction(async (tx) => {
    const claimed = await tx.user.updateMany({
      where: { id: userId, OR: [{ dailyChestClaimedAt: null }, { dailyChestClaimedAt: { lte: eligibleBefore } }] },
      data: { dailyChestClaimedAt: now },
    });
    if (!claimed.count) {
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { dailyChestClaimedAt: true } });
      return { opened: false, experience: 0, nextAt: nextChestAt(user.dailyChestClaimedAt) };
    }
    const reward = await grantEconomyReward(tx, {
      userId,
      experience,
      coins: 0,
      sourceType: "DAILY_CHEST",
      sourceId: now.toISOString(),
      idempotencyKey: `daily-chest:${userId}:${now.getTime()}`,
      description: "Daily Mystery Box",
    });
    return { opened: reward.awarded, experience: reward.experience, nextAt: new Date(now.getTime() + DAILY_CHEST_COOLDOWN_MS) };
  });
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
      return { spun: false, alreadySpun: true, experience: existing.amount, coins: coins?.amount ?? 0, rewardId: existing.description?.match(/wheel:([^\s]+)/)?.[1] ?? null };
    }
    const awarded = await grantEconomyReward(tx, {
      userId,
      experience: reward.experience,
      coins: reward.coins,
      sourceType: "LESSON_WHEEL",
      sourceId: lessonId,
      idempotencyKey,
      description: `Lesson wheel:${reward.id}`,
    });
    return { spun: awarded.awarded, alreadySpun: false, experience: awarded.experience, coins: awarded.coins, rewardId: reward.id };
  }).catch(async (error: unknown) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await prisma.experienceTransaction.findUnique({ where: { idempotencyKey }, select: { amount: true } });
      const coins = await prisma.coinTransaction.findUnique({ where: { idempotencyKey }, select: { amount: true } });
      if (existing) return { spun: false, alreadySpun: true, experience: existing.amount, coins: coins?.amount ?? 0, rewardId: null };
    }
    throw error;
  });
}
