import { prisma } from "@/core/server/prisma";
import { FLOWER_CHESTS } from "@/modules/motivation/utils/flower-chests";

export type FlowerCollectionEntry = {
  id: string;
  names: { en?: string; ru: string; uk?: string };
  rarity: (typeof FLOWER_CHESTS)[number]["rarity"];
  naturalRarityRank: number;
  count: number;
  firstFoundAt: string | null;
  lastFoundAt: string | null;
};

/** The immutable XP ledger is the source of truth for collected flowers.
 * Replaying a chest request cannot mint another copy in the album. */
export async function getFlowerCollection(userId: string) {
  const receipts = await prisma.experienceTransaction.findMany({
    where: { userId, sourceType: { in: ["STREAK_CHEST", "MISTAKE_REVIEW_CHEST", "MISTAKE_ACHIEVEMENT"] }, amount: { gt: 0 }, description: { contains: "flower:" } },
    select: { description: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  const owned = new Map<string, { count: number; firstFoundAt: string; lastFoundAt: string }>();
  for (const receipt of receipts) {
    const id = receipt.description?.match(/(?:^|\|\s*)flower:([a-z-]+)/u)?.[1];
    if (!id) continue;
    const date = receipt.createdAt.toISOString();
    const record = owned.get(id);
    if (record) {
      record.count += 1;
      record.firstFoundAt = date;
    } else {
      owned.set(id, { count: 1, firstFoundAt: date, lastFoundAt: date });
    }
  }
  const flowers: FlowerCollectionEntry[] = FLOWER_CHESTS.map((flower) => {
    const record = owned.get(flower.id);
    return {
      id: flower.id,
      names: flower.names,
      rarity: flower.rarity,
      naturalRarityRank: flower.naturalRarityRank,
      count: record?.count ?? 0,
      firstFoundAt: record?.firstFoundAt ?? null,
      lastFoundAt: record?.lastFoundAt ?? null,
    };
  });
  return {
    flowers,
    discovered: flowers.filter((flower) => flower.count > 0).length,
    total: flowers.length,
    opened: flowers.reduce((sum, flower) => sum + flower.count, 0),
  };
}
