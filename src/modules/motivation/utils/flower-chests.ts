export type FlowerRarity = "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY";

export type FlowerChestDefinition = {
  id: string;
  icon: string;
  hue: number;
  rarity: FlowerRarity;
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
  chamomile: 3400,
  poppy: 2700,
  lungwort: 1800,
  "forget-me-not": 1400,
  clover: 1000,
  bellflower: 700,
  "pink-lily": 200,
  // White Lily remains deliberately exceptional: 1 / 11,201 before the
  // no-repeat re-roll rule is applied.
  "white-lily": 1,
} as const;

/**
 * Flowers common to Ukraine, Belarus, and European Russia. Their reward
 * settings are data, not client input: the server selects the flower and
 * records it together with the immutable reward ledger entry.
 */
export const FLOWER_CHESTS: readonly FlowerChestDefinition[] = [
  { id: "chamomile", icon: "🌼", hue: 48, rarity: "COMMON", names: { en: "Chamomile", ru: "Ромашка", uk: "Ромашка" }, minimumExperience: 10, maximumExperience: 100, hintCredits: 0, translationCredits: 0, xpCoinMinor: 0, questBookDenominator: 16, weight: FLOWER_DROP_RATE_WEIGHTS.chamomile },
  { id: "poppy", icon: "🌺", hue: 4, rarity: "COMMON", names: { en: "Poppy", ru: "Мак", uk: "Мак" }, minimumExperience: 20, maximumExperience: 150, hintCredits: 1, translationCredits: 0, xpCoinMinor: 0, questBookDenominator: 12, weight: FLOWER_DROP_RATE_WEIGHTS.poppy },
  { id: "lungwort", icon: "🪻", hue: 273, rarity: "UNCOMMON", names: { en: "Lungwort", ru: "Медуница", uk: "Медунка" }, minimumExperience: 30, maximumExperience: 180, hintCredits: 1, translationCredits: 1, xpCoinMinor: 0, questBookDenominator: 10, weight: FLOWER_DROP_RATE_WEIGHTS.lungwort },
  { id: "forget-me-not", icon: "🩵", hue: 210, rarity: "UNCOMMON", names: { en: "Forget-me-not", ru: "Незабудка", uk: "Незабудка" }, minimumExperience: 45, maximumExperience: 220, hintCredits: 0, translationCredits: 2, xpCoinMinor: 0, questBookDenominator: 8, weight: FLOWER_DROP_RATE_WEIGHTS["forget-me-not"] },
  { id: "clover", icon: "☘️", hue: 142, rarity: "RARE", names: { en: "Clover", ru: "Клевер", uk: "Конюшина" }, minimumExperience: 70, maximumExperience: 260, hintCredits: 1, translationCredits: 1, xpCoinMinor: 0, questBookDenominator: 7, weight: FLOWER_DROP_RATE_WEIGHTS.clover },
  { id: "bellflower", icon: "🔔", hue: 244, rarity: "RARE", names: { en: "Bellflower", ru: "Колокольчик", uk: "Дзвіночок" }, minimumExperience: 100, maximumExperience: 320, hintCredits: 2, translationCredits: 1, xpCoinMinor: 0, questBookDenominator: 6, weight: FLOWER_DROP_RATE_WEIGHTS.bellflower },
  { id: "pink-lily", icon: "🌸", hue: 322, rarity: "EPIC", names: { en: "Pink lily", ru: "Розовая лилия", uk: "Рожева лілія" }, minimumExperience: 200, maximumExperience: 500, hintCredits: 2, translationCredits: 2, xpCoinMinor: 25, questBookDenominator: 3, weight: FLOWER_DROP_RATE_WEIGHTS["pink-lily"] },
  // The white lily has the smallest non-zero weight in the pool. Its exact
  // 1,000 XP reward is enforced on the server, not in this display record.
  { id: "white-lily", icon: "⚜️", hue: 0, rarity: "LEGENDARY", names: { en: "White lily", ru: "Белая лилия", uk: "Біла лілія" }, minimumExperience: 1000, maximumExperience: 1000, hintCredits: 3, translationCredits: 3, xpCoinMinor: 100, questBookDenominator: 1, weight: FLOWER_DROP_RATE_WEIGHTS["white-lily"] },
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
