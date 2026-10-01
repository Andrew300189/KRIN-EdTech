export const WATER_LILY_SHOP_ID = "water-lily";
export const WATER_LILY_PRICE_COINS = 0.1;
export const WATER_LILY_CAPACITIES = [10, 12, 15, 20, 25, 30, 40, 50, 70, 85, 90, 100, 120, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900, 1000] as const;
export const WATER_LILY_TIERS = WATER_LILY_CAPACITIES.map((capacity) => ({
  id: capacity === 10 ? WATER_LILY_SHOP_ID : `water-lily-${capacity}`,
  capacity,
  price: Number((WATER_LILY_PRICE_COINS * Math.max(1, capacity / 10)).toFixed(2)),
}));
/** Keep the historic capacities redeemable, but offer only five clear choices. */
export const PURCHASABLE_WATER_LILY_CAPACITIES = [10, 25, 50, 100, 250] as const;
export const PURCHASABLE_WATER_LILY_TIERS = WATER_LILY_TIERS.filter((tier) =>
  (PURCHASABLE_WATER_LILY_CAPACITIES as readonly number[]).includes(tier.capacity),
).map((tier, index) => ({ ...tier, rarity: (["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY"] as const)[index] }));

export type WaterLilyInventoryEntry = { id: string; capacity: number; quantity: number };

/** Spend the least total restoration capacity, then the fewest flowers.
 * Multiple lower-tier lilies can cover a longer interrupted answer streak. */
export function planWaterLilyRestore(inventory: readonly WaterLilyInventoryEntry[], required: number) {
  if (!Number.isSafeInteger(required) || required < 1) return null;
  const available = inventory.filter((item) => Number.isSafeInteger(item.capacity) && item.capacity > 0
    && Number.isSafeInteger(item.quantity) && item.quantity > 0);
  if (!available.length || available.reduce((sum, item) => sum + item.capacity * item.quantity, 0) < required) return null;

  const limit = required + Math.max(...available.map((item) => item.capacity)) - 1;
  type PlanNode = { id: string; capacity: number; quantity: number; previous: PlanNode | null };
  const states: Array<{ units: number; node: PlanNode | null } | null> = Array(limit + 1).fill(null);
  states[0] = { units: 0, node: null };
  for (const item of available) {
    // Binary decomposition keeps large inventories cheap while retaining the
    // exact bounded-knapsack result for every possible total capacity.
    let remaining = Math.min(item.quantity, Math.ceil(limit / item.capacity));
    let batch = 1;
    while (remaining > 0) {
      const quantity = Math.min(batch, remaining);
      const capacity = quantity * item.capacity;
      for (let total = limit; total >= capacity; total -= 1) {
        const previous = states[total - capacity];
        if (!previous) continue;
        const units = previous.units + quantity;
        if (!states[total] || units < states[total]!.units) {
          states[total] = { units, node: { id: item.id, capacity: item.capacity, quantity, previous: previous.node } };
        }
      }
      remaining -= quantity;
      batch *= 2;
    }
  }
  const total = states.findIndex((state, capacity) => capacity >= required && state !== null);
  if (total < 0) return null;
  const grouped = new Map<string, { id: string; capacity: number; quantity: number }>();
  for (let node = states[total]!.node; node; node = node.previous) {
    const prior = grouped.get(node.id);
    grouped.set(node.id, { id: node.id, capacity: node.capacity, quantity: (prior?.quantity ?? 0) + node.quantity });
  }
  return { totalCapacity: total, lilies: [...grouped.values()] };
}

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
