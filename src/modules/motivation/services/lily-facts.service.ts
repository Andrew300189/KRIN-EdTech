import { randomInt } from "crypto";
import { prisma } from "@/core/server/prisma";
import { safeTimeZone, userLocalDate } from "@/modules/motivation/utils/local-date";

export const LILY_FACT_CONTEXTS = ["DASHBOARD", "LOADING", "LEAVING", "COMPLETION", "CLICK"] as const;
export type LilyFactContext = (typeof LILY_FACT_CONTEXTS)[number];

export type LilyFact = {
  id: string;
  text: string;
  category: "PHILOLOGY" | "LANGUAGES" | "LITERATURE";
  characterEmotion: "JOYFUL" | "THOUGHTFUL" | "SURPRISED";
};

const CLICK_COOLDOWN_MS = 5 * 60 * 1_000;

function asLilyFact(row: { id: string; text: string; category: string; characterEmotion: string }): LilyFact {
  return {
    id: row.id,
    text: row.text,
    category: row.category === "LANGUAGES" || row.category === "LITERATURE" ? row.category : "PHILOLOGY",
    characterEmotion: row.characterEmotion === "JOYFUL" || row.characterEmotion === "SURPRISED" ? row.characterEmotion : "THOUGHTFUL",
  };
}

/**
 * Server-selected mascot fact. Dashboard greetings are one per learner-local
 * day and manual clicks have a durable five-minute cooldown, so opening more
 * tabs or clearing browser storage cannot spam the fact feed.
 */
export async function requestLilyFact(userId: string, context: LilyFactContext) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId }, select: { timeZone: true } });
    if (!user) throw new Error("User not found");
    const localDate = userLocalDate(safeTimeZone(user.timeZone));
    const now = new Date();

    if (context === "DASHBOARD") {
      const alreadyGreeted = await tx.philologyFactView.findFirst({
        where: { userId, context, localDate },
        select: { id: true },
      });
      if (alreadyGreeted) return { fact: null, retryAfterSeconds: 0 };
    }
    if (context === "CLICK") {
      const latestClick = await tx.philologyFactView.findFirst({
        where: { userId, context },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      });
      const remainingMs = latestClick ? CLICK_COOLDOWN_MS - (now.getTime() - latestClick.createdAt.getTime()) : 0;
      if (remainingMs > 0) return { fact: null, retryAfterSeconds: Math.ceil(remainingMs / 1_000) };
    }

    const latestFact = await tx.philologyFactView.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { factId: true },
    });
    const candidates = await tx.philologyFact.findMany({
      where: {
        isActive: true,
        ...(latestFact?.factId ? { id: { not: latestFact.factId } } : {}),
      },
      select: { id: true, text: true, category: true, characterEmotion: true },
      orderBy: { createdAt: "asc" },
    });
    const pool = candidates.length
      ? candidates
      : await tx.philologyFact.findMany({
        where: { isActive: true },
        select: { id: true, text: true, category: true, characterEmotion: true },
        orderBy: { createdAt: "asc" },
      });
    if (!pool.length) return { fact: null, retryAfterSeconds: 0 };

    const fact = pool[randomInt(pool.length)]!;
    await tx.philologyFactView.create({ data: { userId, factId: fact.id, context, localDate } });
    return { fact: asLilyFact(fact), retryAfterSeconds: 0 };
  });
}
