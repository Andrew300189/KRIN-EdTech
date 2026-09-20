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

const RECENT_FACT_EXCLUSION_LIMIT = 64;

function asLilyFact(row: { id: string; text: string; category: string; characterEmotion: string }): LilyFact {
  return {
    id: row.id,
    text: row.text,
    category: row.category === "LANGUAGES" || row.category === "LITERATURE" ? row.category : "PHILOLOGY",
    characterEmotion: row.characterEmotion === "JOYFUL" || row.characterEmotion === "SURPRISED" ? row.characterEmotion : "THOUGHTFUL",
  };
}

/**
 * Server-selected mascot fact. Every request chooses a card which the learner
 * has not seen recently, including the first request after a page refresh and
 * a new click after closing the bubble. The delivery log remains server-owned
 * so this behaviour cannot be bypassed or reset by browser storage.
 */
export async function requestLilyFact(userId: string, context: LilyFactContext) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId }, select: { timeZone: true } });
    if (!user) throw new Error("User not found");
    const localDate = userLocalDate(safeTimeZone(user.timeZone));
    const recentViews = await tx.philologyFactView.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: RECENT_FACT_EXCLUSION_LIMIT,
      select: { factId: true },
    });
    const recentFactIds = [...new Set(recentViews.map((view) => view.factId))];
    const where = { isActive: true, ...(recentFactIds.length ? { id: { notIn: recentFactIds } } : {}) };
    let total = await tx.philologyFact.count({ where });
    let fact = total
      ? await tx.philologyFact.findFirst({
        where,
        orderBy: { id: "asc" },
        skip: randomInt(total),
        select: { id: true, text: true, category: true, characterEmotion: true },
      })
      : null;

    // The fallback is relevant only after a learner has exhausted the entire
    // catalogue. It still keeps the service usable on a freshly restored DB.
    if (!fact) {
      total = await tx.philologyFact.count({ where: { isActive: true } });
      if (!total) return { fact: null, retryAfterSeconds: 0 };
      fact = await tx.philologyFact.findFirst({
        where: { isActive: true },
        orderBy: { id: "asc" },
        skip: randomInt(total),
        select: { id: true, text: true, category: true, characterEmotion: true },
      });
    }
    if (!fact) return { fact: null, retryAfterSeconds: 0 };
    await tx.philologyFactView.create({ data: { userId, factId: fact.id, context, localDate } });
    return { fact: asLilyFact(fact), retryAfterSeconds: 0 };
  });
}
