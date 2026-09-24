jest.mock("@/core/server/prisma", () => ({ prisma: { $transaction: jest.fn() } }));
jest.mock("@/modules/motivation/services/motivation.service", () => ({ grantEconomyReward: jest.fn() }));

import { prisma } from "@/core/server/prisma";
import { grantEconomyReward } from "@/modules/motivation/services/motivation.service";
import { requestLilyFact } from "@/modules/motivation/services/lily-facts.service";

const transaction = prisma.$transaction as jest.Mock;
const grant = grantEconomyReward as jest.Mock;

function setup(rewardedToday: number) {
  const tx = {
    $executeRaw: jest.fn(),
    user: { findUnique: jest.fn().mockResolvedValue({ timeZone: "Europe/Kyiv" }) },
    philologyFactView: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: "verified-view" }),
    },
    philologyFact: {
      count: jest.fn().mockResolvedValue(1),
      findFirst: jest.fn().mockResolvedValue({ id: "fact-1", text: "A concise fact.", category: "LITERATURE", characterEmotion: "JOYFUL" }),
    },
    experienceTransaction: { count: jest.fn().mockResolvedValue(rewardedToday) },
  };
  transaction.mockImplementation((callback: (value: typeof tx) => unknown) => callback(tx));
  grant.mockResolvedValue({ awarded: true });
  return tx;
}

describe("logo fact XP", () => {
  beforeEach(() => jest.clearAllMocks());

  it("awards exactly 1 XP for an intentional click", async () => {
    const tx = setup(0);
    const result = await requestLilyFact("learner", "CLICK", true);
    expect(result.earnedXp).toBe(1);
    expect(grant).toHaveBeenCalledWith(tx, expect.objectContaining({ experience: 1, sourceType: "PHILOLOGY_FACT", sourceId: "verified-view" }));
  });

  it("does not award XP for automatic facts", async () => {
    setup(0);
    expect((await requestLilyFact("learner", "DASHBOARD")).earnedXp).toBe(0);
    expect(grant).not.toHaveBeenCalled();
  });

  it("keeps fact browsing available after the daily XP limit", async () => {
    setup(10);
    const result = await requestLilyFact("learner", "CLICK", true);
    expect(result.fact?.id).toBe("fact-1");
    expect(result.earnedXp).toBe(0);
    expect(grant).not.toHaveBeenCalled();
  });
});
