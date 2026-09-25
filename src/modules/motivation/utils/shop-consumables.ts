export const WATER_LILY_SHOP_ID = "water-lily";
export const WATER_LILY_PRICE_COINS = 0.1;

/** A purchased booster is consumed on one newly completed lesson. */
export const XP_BOOSTERS = [
  { id: "xp-boost-40", experience: 40, price: 0.1 },
  { id: "xp-boost-15", experience: 15, price: 0.05 },
] as const;

type InventoryEntry = { sourceType: string; sourceId: string };

export function consumableQuantity(entries: readonly InventoryEntry[], itemId: string) {
  const purchases = entries.filter((entry) => entry.sourceType === "SHOP_ITEM" && entry.sourceId === itemId).length;
  const uses = entries.filter((entry) => entry.sourceType === "SHOP_ITEM_USE" && entry.sourceId === itemId).length;
  return Math.max(0, purchases - uses);
}

export function nextXpBooster(entries: readonly InventoryEntry[]) {
  return XP_BOOSTERS.find((booster) => consumableQuantity(entries, booster.id) > 0) ?? null;
}
