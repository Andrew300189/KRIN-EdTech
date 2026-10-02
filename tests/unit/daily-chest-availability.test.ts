import { prisma } from "@/core/server/prisma";
import { grantEconomyReward } from "@/modules/motivation/services/motivation.service";
import { getDailyChestState, openDailyChest } from "@/modules/motivation/services/reward-economy.service";

jest.mock("@/core/server/prisma", () => ({ prisma: {
  user: { findUnique: jest.fn() },
  $transaction: jest.fn(),
} }));
jest.mock("@/modules/motivation/services/motivation.service", () => ({ grantEconomyReward: jest.fn() }));

describe("daily chest calendar availability", () => {
  beforeEach(() => jest.clearAllMocks());
  afterEach(() => jest.useRealTimers());

  it("is ready after local midnight without any lesson or activity", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-10-02T00:30:00.000Z"));
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ dailyChestClaimedAt: new Date("2026-10-01T12:00:00.000Z"), dailyChestTimeZone: "Europe/Kyiv", timeZone: "UTC" });

    await expect(getDailyChestState("learner-1")).resolves.toEqual({ available: true, nextAt: null });
  });

  it("stays closed until the next local midnight after a claim", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-10-02T12:00:00.000Z"));
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ dailyChestClaimedAt: new Date("2026-10-02T08:00:00.000Z"), dailyChestTimeZone: "Europe/Kyiv", timeZone: "UTC" });

    await expect(getDailyChestState("learner-1")).resolves.toEqual({ available: false, nextAt: new Date("2026-10-02T21:00:00.000Z") });
  });

  it("opens once without checking lesson completion", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-10-02T12:00:00.000Z"));
    const tx = {
      $executeRaw: jest.fn(),
      user: { findUniqueOrThrow: jest.fn().mockResolvedValue({ dailyChestClaimedAt: new Date("2026-10-01T12:00:00.000Z"), dailyChestTimeZone: "Europe/Kyiv", timeZone: "UTC" }), update: jest.fn() },
      userStreak: { upsert: jest.fn() },
    };
    (prisma.$transaction as jest.Mock).mockImplementation((callback) => callback(tx));
    (grantEconomyReward as jest.Mock).mockResolvedValue({ awarded: true, experience: 500, coins: 0 });

    await expect(openDailyChest("learner-1")).resolves.toMatchObject({ opened: true, experience: 500, waterLily: 3, nextAt: new Date("2026-10-02T21:00:00.000Z") });
    expect(tx.user.update).toHaveBeenCalledWith({ where: { id: "learner-1" }, data: { dailyChestClaimedAt: new Date("2026-10-02T12:00:00.000Z") } });
    expect(grantEconomyReward).toHaveBeenCalledTimes(1);
  });
});
