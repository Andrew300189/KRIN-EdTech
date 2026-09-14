import { randomInt } from "crypto";
import { Prisma } from "@/generated/prisma-client-payments-runtime";
import { prisma } from "@/core/server/prisma";
import { grantEconomyReward } from "./motivation.service";
import { userLocalDate } from "@/modules/motivation/utils/local-date";

type Tx = Prisma.TransactionClient;

/** Book levels correspond to verified streak milestones. A learner at a later
 * checkpoint can still receive a book, but never one below the earned tier. */
export const STREAK_QUEST_BOOK_LEVEL_MILESTONES = [3, 7, 12, 24, 48, 70, 100, 200, 500, 1_000, 2_500, 10_000] as const;

/** All rewards are rolled only on the server and persisted with the dropped
 * book. Every higher tier has minima above the preceding tier's maxima. */
export const STREAK_QUEST_BOOK_LEVELS = [
  { level: 1, unlockCost: 2, targetCorrectWords: 10, experience: [100, 150], coins: [2, 3], hintCredits: [1, 1], translationCredits: [1, 1] },
  { level: 2, unlockCost: 3, targetCorrectWords: 12, experience: [180, 230], coins: [4, 5], hintCredits: [1, 2], translationCredits: [1, 2] },
  { level: 3, unlockCost: 5, targetCorrectWords: 15, experience: [260, 320], coins: [6, 7], hintCredits: [2, 2], translationCredits: [2, 2] },
  { level: 4, unlockCost: 7, targetCorrectWords: 18, experience: [360, 430], coins: [8, 10], hintCredits: [2, 3], translationCredits: [2, 3] },
  { level: 5, unlockCost: 9, targetCorrectWords: 20, experience: [480, 570], coins: [11, 13], hintCredits: [3, 3], translationCredits: [3, 3] },
  { level: 6, unlockCost: 12, targetCorrectWords: 25, experience: [640, 750], coins: [14, 16], hintCredits: [3, 4], translationCredits: [3, 4] },
  { level: 7, unlockCost: 15, targetCorrectWords: 30, experience: [840, 980], coins: [18, 21], hintCredits: [4, 4], translationCredits: [4, 4] },
  { level: 8, unlockCost: 20, targetCorrectWords: 35, experience: [1_100, 1_280], coins: [23, 26], hintCredits: [4, 5], translationCredits: [4, 5] },
  { level: 9, unlockCost: 25, targetCorrectWords: 40, experience: [1_450, 1_680], coins: [29, 33], hintCredits: [5, 5], translationCredits: [5, 5] },
  { level: 10, unlockCost: 35, targetCorrectWords: 50, experience: [1_900, 2_200], coins: [37, 42], hintCredits: [5, 6], translationCredits: [5, 6] },
  { level: 11, unlockCost: 50, targetCorrectWords: 60, experience: [2_500, 2_900], coins: [47, 53], hintCredits: [6, 7], translationCredits: [6, 7] },
  { level: 12, unlockCost: 75, targetCorrectWords: 75, experience: [3_300, 3_800], coins: [60, 68], hintCredits: [8, 9], translationCredits: [8, 9] },
] as const;

export const STREAK_QUEST_BOOK = {
  dropDenominator: 8,
} as const;

type RewardRange = readonly [number, number];
type QuestBookLevelDefinition = typeof STREAK_QUEST_BOOK_LEVELS[number];

export function streakQuestBookLevelForMilestone(milestone: number) {
  const normalized = Math.max(0, Math.trunc(milestone));
  return STREAK_QUEST_BOOK_LEVEL_MILESTONES.reduce<number>((level, threshold, index) => normalized >= threshold ? index + 1 : level, 1);
}

function randomInRange([minimum, maximum]: RewardRange) {
  return minimum + randomInt(maximum - minimum + 1);
}

function questBookRewardForLevel(level: number) {
  const definition = STREAK_QUEST_BOOK_LEVELS[Math.min(STREAK_QUEST_BOOK_LEVELS.length, Math.max(1, Math.trunc(level))) - 1] as QuestBookLevelDefinition;
  return {
    level: definition.level,
    unlockCost: definition.unlockCost,
    target: definition.targetCorrectWords,
    experienceReward: randomInRange(definition.experience),
    coinReward: randomInRange(definition.coins),
    hintCredits: randomInRange(definition.hintCredits),
    translationCredits: randomInRange(definition.translationCredits),
  };
}

type QuestBookRecord = {
  id: string;
  sourceMilestone: number;
  level: number;
  status: string;
  unlockCost: number;
  target: number;
  progress: number;
  experienceReward: number;
  coinReward: number;
  hintCredits: number;
  translationCredits: number;
};

export type StreakQuestBookSummary = QuestBookRecord;

/** Converts immutable correct-review totals into monotonic book progress.
 * Incorrect answers leave the total unchanged, so they cannot move a quest. */
export function streakQuestBookProgress({
  baselineCorrectWords,
  correctWordAnswers,
  currentProgress,
  target,
}: {
  baselineCorrectWords: number;
  correctWordAnswers: number;
  currentProgress: number;
  target: number;
}) {
  return Math.min(target, Math.max(currentProgress, correctWordAnswers - baselineCorrectWords, 0));
}

function summary(book: QuestBookRecord): StreakQuestBookSummary {
  return {
    id: book.id,
    sourceMilestone: book.sourceMilestone,
    level: book.level,
    status: book.status,
    unlockCost: book.unlockCost,
    target: book.target,
    progress: Math.min(book.target, book.progress),
    experienceReward: book.experienceReward,
    coinReward: book.coinReward,
    hintCredits: book.hintCredits,
    translationCredits: book.translationCredits,
  };
}

async function lockQuestBook(tx: Tx, userId: string, bookId: string) {
  await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${`streak-quest-book:${userId}:${bookId}`}))`);
}

/** There can be only one unopened or active book at a time. The drop chance
 * is rolled in the same transaction as the chest reward, never in the UI. */
export async function maybeDropStreakQuestBook(tx: Tx, userId: string, sourceMilestone: number) {
  const existing = await tx.streakQuestBook.findUnique({
    where: { userId_sourceMilestone: { userId, sourceMilestone } },
  });
  if (existing) return summary(existing);

  const pendingCount = await tx.streakQuestBook.count({
    where: { userId, status: { in: ["LOCKED", "ACTIVE"] } },
  });
  if (pendingCount || randomInt(STREAK_QUEST_BOOK.dropDenominator) !== 0) return null;

  const reward = questBookRewardForLevel(streakQuestBookLevelForMilestone(sourceMilestone));
  const book = await tx.streakQuestBook.create({
    data: {
      userId,
      sourceMilestone,
      ...reward,
    },
  });
  return summary(book);
}

export async function getStreakQuestBookForSource(tx: Tx, userId: string, sourceMilestone: number) {
  const book = await tx.streakQuestBook.findUnique({
    where: { userId_sourceMilestone: { userId, sourceMilestone } },
  });
  return book ? summary(book) : null;
}

export async function listStreakQuestBooks(userId: string) {
  const books = await prisma.streakQuestBook.findMany({
    where: { userId },
    orderBy: { droppedAt: "desc" },
  });
  const priority: Record<string, number> = { LOCKED: 0, ACTIVE: 1, COMPLETED: 2 };
  return books.sort((left, right) => (priority[left.status] ?? 3) - (priority[right.status] ?? 3)).map(summary);
}

/** Spend regular KRIN Coins only after the book is confirmed to be locked.
 * The transaction lock and immutable coin ledger make a retry free. */
export async function unlockStreakQuestBook(userId: string, bookId: string) {
  return prisma.$transaction(async (tx) => {
    await lockQuestBook(tx, userId, bookId);
    const book = await tx.streakQuestBook.findFirst({ where: { id: bookId, userId } });
    if (!book) throw new Error("Quest book not found.");
    if (book.status !== "LOCKED") return { book: summary(book), alreadyUnlocked: true };

    const wallet = await tx.userWallet.upsert({ where: { userId }, create: { userId }, update: {} });
    const spent = await tx.userWallet.updateMany({
      where: { id: wallet.id, balance: { gte: book.unlockCost } },
      data: { balance: { decrement: book.unlockCost }, lifetimeSpent: { increment: book.unlockCost } },
    });
    if (!spent.count) throw new Error(`You need ${book.unlockCost} KRIN Coins to unlock this book.`);

    const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { timeZone: true } });
    const balanceAfter = wallet.balance - book.unlockCost;
    await tx.coinTransaction.create({
      data: {
        userId,
        walletId: wallet.id,
        amount: -book.unlockCost,
        amountMinor: -book.unlockCost * 100,
        balanceBefore: wallet.balance,
        balanceAfter,
        balanceBeforeMinor: wallet.balance * 100 + wallet.fractionalBalance,
        balanceAfterMinor: balanceAfter * 100 + wallet.fractionalBalance,
        type: "PURCHASE",
        sourceType: "STREAK_QUEST_BOOK_UNLOCK",
        sourceId: book.id,
        idempotencyKey: `streak-quest-book-unlock:${book.id}`,
        localDate: userLocalDate(user.timeZone),
        description: "Unlocked a streak quest book",
      },
    });
    const baselineCorrectWords = await tx.wordReviewAttempt.count({ where: { userId, isCorrect: true } });
    const unlocked = await tx.streakQuestBook.update({
      where: { id: book.id },
      data: { status: "ACTIVE", unlockedAt: new Date(), baselineCorrectWords, progress: 0 },
    });
    return { book: summary(unlocked), alreadyUnlocked: false };
  });
}

/** Called only after a server-validated vocabulary answer has produced its
 * immutable review attempt. The quest therefore cannot advance from clicks,
 * client counters, or a forged progress request. */
export async function recordStreakQuestBookVocabularyReview(tx: Tx, userId: string) {
  const activeBooks = await tx.streakQuestBook.findMany({ where: { userId, status: "ACTIVE" } });
  if (!activeBooks.length) return [];

  const correctWordAnswers = await tx.wordReviewAttempt.count({ where: { userId, isCorrect: true } });
  const completed = [] as Array<{ book: StreakQuestBookSummary; experience: number; coins: number; hintCredits: number; translationCredits: number }>;
  for (const book of activeBooks) {
    const progress = streakQuestBookProgress({
      baselineCorrectWords: book.baselineCorrectWords,
      correctWordAnswers,
      currentProgress: book.progress,
      target: book.target,
    });
    if (progress < book.target) {
      if (progress !== book.progress) await tx.streakQuestBook.update({ where: { id: book.id }, data: { progress } });
      continue;
    }

    const transitioned = await tx.streakQuestBook.updateMany({
      where: { id: book.id, status: "ACTIVE" },
      data: { status: "COMPLETED", progress: book.target, completedAt: new Date() },
    });
    if (!transitioned.count) continue;

    const reward = await grantEconomyReward(tx, {
      userId,
      experience: book.experienceReward,
      krinCoins: book.coinReward,
      hintCredits: book.hintCredits,
      translationCredits: book.translationCredits,
      sourceType: "STREAK_QUEST_BOOK",
      sourceId: book.id,
      idempotencyKey: `streak-quest-book-complete:${book.id}`,
      description: `Completed a level ${book.level} streak quest book: train ${book.target} words`,
    });
    completed.push({
      book: { ...summary(book), status: "COMPLETED", progress: book.target },
      experience: reward.experience,
      coins: reward.coins,
      hintCredits: reward.hintCredits,
      translationCredits: reward.translationCredits,
    });
  }
  return completed;
}
