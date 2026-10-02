import { prisma } from "@/core/server/prisma";
import { getDailyChestState } from "@/modules/motivation/services/reward-economy.service";

jest.mock("@/core/server/prisma", () => ({ prisma: {
  user: { findUnique: jest.fn() },
  userDailyActivity: { findUnique: jest.fn() },
  learningActivity: { findFirst: jest.fn() },
} }));

describe("daily chest lesson eligibility", () => {
  afterEach(() => jest.useRealTimers());

  it("accepts a verified lesson completed today in the chest zone even when activity used UTC", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-10-02T00:30:00.000Z"));
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ dailyChestClaimedAt: new Date("2026-10-01T12:00:00.000Z"), dailyChestTimeZone: "Europe/Kyiv", timeZone: "UTC" });
    (prisma.userDailyActivity.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.learningActivity.findFirst as jest.Mock).mockResolvedValue({ id: "completion-1" });

    await expect(getDailyChestState("learner-1")).resolves.toMatchObject({ available: true, lessonRequired: false, nextAt: null });
    expect(prisma.learningActivity.findFirst).toHaveBeenCalledWith({
      where: { userId: "learner-1", type: "LESSON_COMPLETED", occurredAt: {
        gte: new Date("2026-10-01T21:00:00.000Z"),
        lt: new Date("2026-10-02T21:00:00.000Z"),
      } }, select: { id: true },
    });
  });

  it("keeps an already opened chest distinct from a chest that still needs a lesson", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-10-02T12:00:00.000Z"));
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ dailyChestClaimedAt: new Date("2026-10-02T08:00:00.000Z"), dailyChestTimeZone: "Europe/Kyiv", timeZone: "UTC" });
    (prisma.userDailyActivity.findUnique as jest.Mock).mockClear();
    (prisma.learningActivity.findFirst as jest.Mock).mockClear();

    await expect(getDailyChestState("learner-1")).resolves.toMatchObject({ available: false, lessonRequired: false, nextAt: new Date("2026-10-02T21:00:00.000Z") });
    expect(prisma.userDailyActivity.findUnique).not.toHaveBeenCalled();
    expect(prisma.learningActivity.findFirst).not.toHaveBeenCalled();
  });
});
