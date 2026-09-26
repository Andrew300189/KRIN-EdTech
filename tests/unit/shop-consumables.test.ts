import { consumableQuantity, nextXpBooster, planWaterLilyRestore, WATER_LILY_CAPACITIES, WATER_LILY_TIERS, XP_BOOSTERS } from "@/modules/motivation/utils/shop-consumables";
import { SHOP_ITEMS } from "@/modules/motivation/services/reward-economy.service";

describe("purchased XP booster inventory", () => {
  it("offers all 30 Water Lily capacities and both server-priced boosters", () => {
    const lilies = SHOP_ITEMS.filter((item) => item.kind === "recovery");
    expect(lilies).toHaveLength(WATER_LILY_CAPACITIES.length);
    expect(lilies.map((item) => [item.id, item.price])).toEqual(WATER_LILY_TIERS.map((tier) => [tier.id, tier.price]));
    expect(SHOP_ITEMS.filter((item) => item.kind === "booster").map((item) => [item.id, item.price])).toEqual([
      ["xp-boost-40", 0.1], ["xp-boost-15", 0.05],
    ]);
  });

  it("counts repeat purchases minus verified lesson uses", () => {
    const entries = [
      { sourceType: "SHOP_ITEM", sourceId: "xp-boost-15" },
      { sourceType: "SHOP_ITEM", sourceId: "xp-boost-15" },
      { sourceType: "SHOP_ITEM_USE", sourceId: "xp-boost-15" },
      { sourceType: "SHOP_ITEM", sourceId: "avatar-owl" },
    ];
    expect(consumableQuantity(entries, "xp-boost-15")).toBe(1);
    expect(consumableQuantity(entries, "xp-boost-40")).toBe(0);
    expect(nextXpBooster(entries)).toEqual(XP_BOOSTERS[1]);
  });

  it("prefers the stronger booster and cannot expose a negative balance", () => {
    const entries = [
      { sourceType: "SHOP_ITEM", sourceId: "xp-boost-40" },
      { sourceType: "SHOP_ITEM", sourceId: "xp-boost-15" },
    ];
    expect(nextXpBooster(entries)).toEqual(XP_BOOSTERS[0]);
    expect(consumableQuantity([{ sourceType: "SHOP_ITEM_USE", sourceId: "xp-boost-15" }], "xp-boost-15")).toBe(0);
  });

  it("combines two 10-answer lilies to restore a 12-answer streak", () => {
    expect(planWaterLilyRestore([{ id: "water-lily", capacity: 10, quantity: 21 }], 12)).toEqual({
      totalCapacity: 20,
      lilies: [{ id: "water-lily", capacity: 10, quantity: 2 }],
    });
    expect(planWaterLilyRestore([{ id: "water-lily", capacity: 10, quantity: 1 }], 12)).toBeNull();
  });

  it("preserves valuable high-tier lilies when a smaller combination suffices", () => {
    expect(planWaterLilyRestore([
      { id: "water-lily-100", capacity: 100, quantity: 1 },
      { id: "water-lily-12", capacity: 12, quantity: 1 },
      { id: "water-lily", capacity: 10, quantity: 2 },
    ], 12)).toEqual({ totalCapacity: 12, lilies: [{ id: "water-lily-12", capacity: 12, quantity: 1 }] });
  });
});
