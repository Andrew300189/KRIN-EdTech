import { FLOWER_CHESTS, FLOWER_DROP_RATE_WEIGHTS, WATER_LILY, WHITE_LILY_FLOWER_ID, flowerChestById, flowerRestoreCycle, isWhiteLily, selectRandomFlowerChest } from "@/modules/motivation/utils/flower-chests";

describe("flower chest rewards", () => {
  it("never selects the immediately previous ordinary flower", () => {
    const previous = "chamomile";
    const selected = selectRandomFlowerChest(previous, () => 0);

    expect(selected.id).not.toBe(previous);
    expect(selected.weight).toBeGreaterThan(0);
  });

  it("uses one unambiguous 50-answer band for each separate Water Lily drop", () => {
    expect(flowerRestoreCycle(3)).toBe(0);
    expect(flowerRestoreCycle(48)).toBe(0);
    expect(flowerRestoreCycle(70)).toBe(1);
    expect(flowerRestoreCycle(100)).toBe(1);
    expect(flowerRestoreCycle(103)).toBe(2);
  });

  it("keeps the Water Lily outside the random flower pool and exposes explicit server weights", () => {
    expect(flowerChestById(WATER_LILY.id)).toBeNull();
    expect(FLOWER_DROP_RATE_WEIGHTS["white-lily"]).toBe(1);
    expect(FLOWER_CHESTS.reduce((total, flower) => total + flower.weight, 0)).toBeGreaterThan(11_000);
  });

  it("defines a single legendary White Lily with its fixed XP band", () => {
    const whiteLily = flowerChestById(WHITE_LILY_FLOWER_ID);

    expect(whiteLily).not.toBeNull();
    expect(isWhiteLily(whiteLily!)).toBe(true);
    expect(whiteLily?.minimumExperience).toBe(1_000);
    expect(whiteLily?.maximumExperience).toBe(1_000);
    expect(FLOWER_CHESTS.filter((flower) => flower.id === WHITE_LILY_FLOWER_ID)).toHaveLength(1);
  });
});
