import { consumableQuantity, nextXpBooster, XP_BOOSTERS } from "@/modules/motivation/utils/shop-consumables";
import { SHOP_ITEMS } from "@/modules/motivation/services/reward-economy.service";

describe("purchased XP booster inventory", () => {
  it("offers the Water Lily and both server-priced boosters in the shop", () => {
    expect(SHOP_ITEMS.filter((item) => item.kind === "recovery" || item.kind === "booster").map((item) => [item.id, item.price])).toEqual([
      ["water-lily", 0.1],
      ["xp-boost-40", 0.1],
      ["xp-boost-15", 0.05],
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
});
