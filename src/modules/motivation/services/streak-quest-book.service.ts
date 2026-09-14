import { randomInt } from "crypto";
import { Prisma } from "@/generated/prisma-client-payments-runtime";
import { prisma } from "@/core/server/prisma";
import { grantEconomyReward } from "./motivation.service";
import { userLocalDate } from "@/modules/motivation/utils/local-date";

type Tx = Prisma.TransactionClient;

/** Initial economy tuning for the book that can be found in a streak chest.
 * These values are selected only on the server and can be adjusted centrally. */
export const STREAK_QUEST_BOOK = {
  dropDenominator: 8,
  unlockCost: 2,
  targetCorrectWords: 10,
  experienceReward: 120,
  coinReward: 2,
  hintCredits: 1,
  translationCredits: 1,
} as const;

type QuestBookRecord = {
  id: string;
  sourceMilestone: number;
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

  const book = await tx.streakQuestBook.create({
    data: {
      userId,
      sourceMilestone,
      unlockCost: STREAK_QUEST_BOOK.unlockCost,
      target: STREAK_QUEST_BOOK.targetCorrectWords,
      experienceReward: STREAK_QUEST_BOOK.experienceReward,
      coinReward: STREAK_QUEST_BOOK.coinReward,
      hintCredits: STREAK_QUEST_BOOK.hintCredits,
      translationCredits: STREAK_QUEST_BOOK.translationCredits,
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
      description: "Completed a streak quest book: train 10 words",
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
