export type FlowerRarity = "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY";

export type FlowerChestDefinition = {
  id: string;
  icon: string;
  hue: number;
  rarity: FlowerRarity;
  /** 1 is widespread in the target flora; 5 is locally exceptional/protected. */
  naturalRarityRank: 1 | 2 | 3 | 4 | 5;
  names: { en: string; ru: string; uk: string };
  /** Relative XP band. The server clamps the verified chest reward to it. */
  minimumExperience: number;
  maximumExperience: number;
  hintCredits: number;
  translationCredits: number;
  xpCoinMinor: number;
  questBookDenominator: number | null;
  weight: number;
};

/**
 * The drop-rate configuration is deliberately a server module.  It is never
 * returned as a claimable value or accepted from a browser request: a weight
 * only defines the relative chance in the server-side flower pool.
 */
export const FLOWER_DROP_RATE_WEIGHTS = {
  chamomile: 3500,
  poppy: 3000,
  clover: 2700,
  "forget-me-not": 2000,
  lungwort: 900,
  bellflower: 500,
  "lady-slipper": 80,
  "pink-lily": 15,
  // White Lily remains deliberately exceptional: 1 / 12,696 before the
  // no-repeat re-roll rule is applied.
  "white-lily": 1,
} as const;

/**
 * The ranks reflect occurrence in the target flora, not flower-shop prices.
 * Chamomile, poppy, red clover and field forget-me-not are widespread across
 * Ukraine, Belarus and large parts of Russia. Lungwort and bellflower are
 * more habitat-bound. Forest lily and lady's slipper orchid are protected in
 * Ukraine, so they sit at the serious end of the reward ladder. The values
 * below keep every rarer tier both less likely and more valuable.
 *
 * Their reward settings are server data, not client input: the server selects
 * the flower and records it with the immutable reward ledger entry.
 */
export const FLOWER_CHESTS: readonly FlowerChestDefinition[] = [
  { id: "chamomile", icon: "🌼", hue: 48, rarity: "COMMON", naturalRarityRank: 1, names: { en: "Chamomile", ru: "Ромашка", uk: "Ромашка" }, minimumExperience: 10, maximumExperience: 45, hintCredits: 0, translationCredits: 0, xpCoinMinor: 0, questBookDenominator: 20, weight: FLOWER_DROP_RATE_WEIGHTS.chamomile },
  { id: "poppy", icon: "🌺", hue: 4, rarity: "COMMON", naturalRarityRank: 1, names: { en: "Poppy", ru: "Мак", uk: "Мак" }, minimumExperience: 20, maximumExperience: 60, hintCredits: 0, translationCredits: 0, xpCoinMinor: 0, questBookDenominator: 18, weight: FLOWER_DROP_RATE_WEIGHTS.poppy },
  { id: "clover", icon: "☘️", hue: 142, rarity: "COMMON", naturalRarityRank: 1, names: { en: "Clover", ru: "Клевер", uk: "Конюшина" }, minimumExperience: 30, maximumExperience: 75, hintCredits: 1, translationCredits: 0, xpCoinMinor: 0, questBookDenominator: 16, weight: FLOWER_DROP_RATE_WEIGHTS.clover },
  { id: "forget-me-not", icon: "🩵", hue: 210, rarity: "COMMON", naturalRarityRank: 1, names: { en: "Forget-me-not", ru: "Незабудка", uk: "Незабудка" }, minimumExperience: 40, maximumExperience: 90, hintCredits: 0, translationCredits: 1, xpCoinMinor: 0, questBookDenominator: 14, weight: FLOWER_DROP_RATE_WEIGHTS["forget-me-not"] },
  { id: "lungwort", icon: "🪻", hue: 273, rarity: "UNCOMMON", naturalRarityRank: 2, names: { en: "Lungwort", ru: "Медуница", uk: "Медунка" }, minimumExperience: 90, maximumExperience: 150, hintCredits: 1, translationCredits: 1, xpCoinMinor: 0, questBookDenominator: 10, weight: FLOWER_DROP_RATE_WEIGHTS.lungwort },
  { id: "bellflower", icon: "🔔", hue: 244, rarity: "UNCOMMON", naturalRarityRank: 2, names: { en: "Bellflower", ru: "Колокольчик", uk: "Дзвіночок" }, minimumExperience: 150, maximumExperience: 220, hintCredits: 2, translationCredits: 1, xpCoinMinor: 0, questBookDenominator: 8, weight: FLOWER_DROP_RATE_WEIGHTS.bellflower },
  { id: "lady-slipper", icon: "👠", hue: 42, rarity: "RARE", naturalRarityRank: 3, names: { en: "Lady's slipper orchid", ru: "Венерин башмачок", uk: "Зозулині черевички" }, minimumExperience: 230, maximumExperience: 350, hintCredits: 2, translationCredits: 2, xpCoinMinor: 10, questBookDenominator: 5, weight: FLOWER_DROP_RATE_WEIGHTS["lady-slipper"] },
  { id: "pink-lily", icon: "🌸", hue: 322, rarity: "EPIC", naturalRarityRank: 4, names: { en: "Forest lily", ru: "Лесная лилия", uk: "Лісова лілія" }, minimumExperience: 360, maximumExperience: 500, hintCredits: 3, translationCredits: 3, xpCoinMinor: 25, questBookDenominator: 3, weight: FLOWER_DROP_RATE_WEIGHTS["pink-lily"] },
  // The white lily has the smallest non-zero weight in the pool. Its exact
  // 1,000 XP reward is enforced on the server, not in this display record.
  { id: "white-lily", icon: "⚜️", hue: 0, rarity: "LEGENDARY", naturalRarityRank: 5, names: { en: "White lily", ru: "Белая лилия", uk: "Біла лілія" }, minimumExperience: 1000, maximumExperience: 1000, hintCredits: 4, translationCredits: 4, xpCoinMinor: 100, questBookDenominator: 1, weight: FLOWER_DROP_RATE_WEIGHTS["white-lily"] },
] as const;

/** A Water Lily is an inventory item, awarded beside an ordinary flower. */
export const WATER_LILY = {
  id: "water-lily",
  icon: "🪷",
  names: { en: "Water lily", ru: "Кувшинка", uk: "Латаття" },
} as const;
export const WHITE_LILY_FLOWER_ID = "white-lily";

export function flowerChestById(id: string | null | undefined) {
  return FLOWER_CHESTS.find((flower) => flower.id === id) ?? null;
}

/** A chest milestone belongs to exactly one 50-correct-answer band. */
export function flowerRestoreCycle(milestone: number) {
  return Math.max(0, Math.floor((Math.max(1, Math.trunc(milestone)) - 1) / 50));
}

export function isWhiteLily(flower: FlowerChestDefinition) {
  return flower.id === WHITE_LILY_FLOWER_ID;
}

/**
 * Select from the ordinary flower pool without repeating the previous flower.
 * `roll` is supplied by the server's cryptographic RNG, which keeps this
 * module deterministic and straightforward to unit test.
 */
export function selectRandomFlowerChest(lastFlowerId: string | null, roll: (exclusiveMaximum: number) => number) {
  const candidates = FLOWER_CHESTS.filter((flower) => flower.weight > 0 && flower.id !== lastFlowerId);
  const pool = candidates.length ? candidates : FLOWER_CHESTS.filter((flower) => flower.weight > 0);
  const totalWeight = pool.reduce((total, flower) => total + flower.weight, 0);
  let ticket = roll(totalWeight);
  for (const flower of pool) {
    if (ticket < flower.weight) return flower;
    ticket -= flower.weight;
  }
  return pool[pool.length - 1]!;
}
