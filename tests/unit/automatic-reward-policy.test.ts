import { DEFAULT_REWARD_RULES } from "@/modules/motivation/constants/motivation-config";
import { achievementSchema, rewardRuleSchema } from "@/modules/motivation/schemas/motivation.schemas";

describe("automatic reward policy", () => {
  it("keeps every default learning event XP-only", () => {
    expect(DEFAULT_REWARD_RULES.every((rule) => rule.coinAmount === 0)).toBe(true);
  });

  it("rejects attempts to configure coins for automatic rewards", () => {
    expect(() => rewardRuleSchema.parse({
      experienceAmount: 50,
      coinAmount: 1,
      dailyLimit: null,
      weeklyLimit: null,
      isActive: true,
    })).toThrow();

    expect(() => achievementSchema.parse({
      code: "XP_ONLY",
      title: "XP only",
      description: "An automatic reward with no coin payout.",
      icon: "✦",
      category: "LEARNING",
      rarity: "COMMON",
      conditionType: "LESSONS_COMPLETED",
      target: 1,
      experienceReward: 20,
      coinReward: 1,
    })).toThrow();
  });
});
