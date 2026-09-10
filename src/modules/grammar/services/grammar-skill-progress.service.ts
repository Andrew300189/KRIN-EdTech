import { Prisma } from "@/generated/prisma-client-payments-runtime";

export type GrammarSkillProgressSnapshot = {
  attemptCount: number;
  correctCount: number;
  incorrectCount: number;
  consecutiveErrors: number;
};

export type GrammarSkillProgressState = GrammarSkillProgressSnapshot & {
  masteryPercent: number;
  status: "LEARNING" | "REVIEW_DUE" | "MASTERED";
  nextReviewAt: Date | null;
  masteredAt: Date | null;
};

/** Pure, deterministic transition used by the transactional attempt handler. */
export function nextGrammarSkillProgress(
  previous: GrammarSkillProgressSnapshot | null,
  isCorrect: boolean,
  now = new Date(),
): GrammarSkillProgressState {
  const attemptCount = (previous?.attemptCount ?? 0) + 1;
  const correctCount = (previous?.correctCount ?? 0) + (isCorrect ? 1 : 0);
  const incorrectCount = (previous?.incorrectCount ?? 0) + (isCorrect ? 0 : 1);
  const consecutiveErrors = isCorrect ? 0 : (previous?.consecutiveErrors ?? 0) + 1;
  const masteryPercent = Math.round((correctCount / attemptCount) * 100);
  const mastered = consecutiveErrors === 0 && correctCount >= 3 && masteryPercent >= 75;
  const reviewDue = !isCorrect && consecutiveErrors >= 2;

  return {
    attemptCount,
    correctCount,
    incorrectCount,
    consecutiveErrors,
    masteryPercent,
    status: mastered ? "MASTERED" : reviewDue ? "REVIEW_DUE" : "LEARNING",
    nextReviewAt: mastered
      ? new Date(now.getTime() + 21 * 24 * 60 * 60_000)
      : reviewDue
        ? now
        : new Date(now.getTime() + 24 * 60 * 60_000),
    masteredAt: mastered ? now : null,
  };
}

/**
 * Records skill-level learning state from an immutable exercise attempt. The
 * caller runs this in the same transaction as the attempt and mistake record,
 * so a retry cannot create a visible adaptive queue without its evidence.
 */
export async function recordGrammarSkillAttempt(
  tx: Prisma.TransactionClient,
  input: { userId: string; grammarSkillIds: readonly string[]; isCorrect: boolean; now?: Date },
) {
  const now = input.now ?? new Date();
  const updated = [] as Array<{ grammarSkillId: string; status: GrammarSkillProgressState["status"]; masteryPercent: number; consecutiveErrors: number }>;
  for (const grammarSkillId of new Set(input.grammarSkillIds)) {
    const previous = await tx.userGrammarSkillProgress.findUnique({
      where: { userId_grammarSkillId: { userId: input.userId, grammarSkillId } },
      select: { attemptCount: true, correctCount: true, incorrectCount: true, consecutiveErrors: true },
    });
    const next = nextGrammarSkillProgress(previous, input.isCorrect, now);
    await tx.userGrammarSkillProgress.upsert({
      where: { userId_grammarSkillId: { userId: input.userId, grammarSkillId } },
      create: {
        userId: input.userId,
        grammarSkillId,
        ...next,
        lastPracticedAt: now,
      },
      update: {
        ...next,
        lastPracticedAt: now,
      },
    });
    updated.push({ grammarSkillId, status: next.status, masteryPercent: next.masteryPercent, consecutiveErrors: next.consecutiveErrors });
  }
  return updated;
}
