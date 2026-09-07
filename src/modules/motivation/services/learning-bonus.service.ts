import { Prisma } from "@/generated/prisma-client-payments-runtime";
import { prisma } from "@/core/server/prisma";

type Tx = Prisma.TransactionClient;

export type LearningBonusKind = "HINT" | "TRANSLATION";
export type LearningBonusBalance = { hintCredits: number; translationCredits: number };

function balanceView(value: { hintCredits: number; translationCredits: number }): LearningBonusBalance {
  return { hintCredits: value.hintCredits, translationCredits: value.translationCredits };
}

export async function getLearningBonusBalance(userId: string): Promise<LearningBonusBalance> {
  const balance = await prisma.userLearningBonusBalance.upsert({ where: { userId }, create: { userId }, update: {} });
  return balanceView(balance);
}

/**
 * Atomically spends a single coloured credit. The balance and its immutable
 * ledger share a transaction, so duplicate clicks cannot consume two credits.
 */
export async function consumeLearningBonusCredit(
  tx: Tx,
  input: { userId: string; kind: LearningBonusKind; sourceType: string; sourceId: string; idempotencyKey: string; description: string },
) {
  const existing = await tx.learningBonusTransaction.findUnique({ where: { idempotencyKey: input.idempotencyKey }, select: { id: true } });
  const balance = await tx.userLearningBonusBalance.upsert({ where: { userId: input.userId }, create: { userId: input.userId }, update: {} });
  if (existing) return { consumed: true, alreadyConsumed: true, balance: balanceView(balance) };

  const consumed = input.kind === "HINT"
    ? await tx.userLearningBonusBalance.updateMany({ where: { id: balance.id, hintCredits: { gte: 1 } }, data: { hintCredits: { decrement: 1 }, lifetimeHintCreditsSpent: { increment: 1 } } })
    : await tx.userLearningBonusBalance.updateMany({ where: { id: balance.id, translationCredits: { gte: 1 } }, data: { translationCredits: { decrement: 1 }, lifetimeTranslationCreditsSpent: { increment: 1 } } });
  if (!consumed.count) return { consumed: false, alreadyConsumed: false, balance: balanceView(balance) };

  const updated = await tx.userLearningBonusBalance.findUniqueOrThrow({ where: { id: balance.id } });
  await tx.learningBonusTransaction.create({
    data: {
      userId: input.userId,
      balanceId: balance.id,
      kind: input.kind,
      amount: -1,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      idempotencyKey: input.idempotencyKey,
      description: input.description,
    },
  });
  return { consumed: true, alreadyConsumed: false, balance: balanceView(updated) };
}

/** Award credits only from server-selected economy rewards. */
export async function grantLearningBonusCredits(
  tx: Tx,
  input: { userId: string; hintCredits: number; translationCredits: number; sourceType: string; sourceId: string; idempotencyKey: string; description: string },
) {
  const hintCredits = Math.max(0, Math.trunc(input.hintCredits));
  const translationCredits = Math.max(0, Math.trunc(input.translationCredits));
  if (!hintCredits && !translationCredits) return { hintCredits: 0, translationCredits: 0, balance: null as LearningBonusBalance | null };

  const balance = await tx.userLearningBonusBalance.upsert({ where: { userId: input.userId }, create: { userId: input.userId }, update: {} });
  const updated = await tx.userLearningBonusBalance.update({
    where: { id: balance.id },
    data: {
      ...(hintCredits ? { hintCredits: { increment: hintCredits }, lifetimeHintCreditsEarned: { increment: hintCredits } } : {}),
      ...(translationCredits ? { translationCredits: { increment: translationCredits }, lifetimeTranslationCreditsEarned: { increment: translationCredits } } : {}),
    },
  });
  if (hintCredits) await tx.learningBonusTransaction.create({ data: { userId: input.userId, balanceId: balance.id, kind: "HINT", amount: hintCredits, sourceType: input.sourceType, sourceId: input.sourceId, idempotencyKey: `${input.idempotencyKey}:hint`, description: input.description } });
  if (translationCredits) await tx.learningBonusTransaction.create({ data: { userId: input.userId, balanceId: balance.id, kind: "TRANSLATION", amount: translationCredits, sourceType: input.sourceType, sourceId: input.sourceId, idempotencyKey: `${input.idempotencyKey}:translation`, description: input.description } });
  return { hintCredits, translationCredits, balance: balanceView(updated) };
}
