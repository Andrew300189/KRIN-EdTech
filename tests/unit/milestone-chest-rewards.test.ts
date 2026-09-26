import { MILESTONE_CHEST_REWARDS } from "@/modules/motivation/services/reward-economy.service";

describe("fixed learner milestone chests", () => {
  it("keeps server-owned XP and Water Lily quantities aligned with the published ladder", () => {
    expect(MILESTONE_CHEST_REWARDS).toEqual({
      FIRST_STEPS: { experience: 300, waterLilies: 1 },
      LESSON_3: { experience: 500, waterLilies: 2 },
      LESSON_7: { experience: 1500, waterLilies: 5 },
      LESSON_9: { experience: 2000, waterLilies: 7 },
      EVERY_3_LESSONS: { experience: 500, waterLilies: 2 },
      EVERY_7_LESSONS: { experience: 1500, waterLilies: 5 },
      EVERY_9_LESSONS: { experience: 2000, waterLilies: 7 },
      EVERY_12_LESSONS: { experience: 3000, waterLilies: 12 },
      MODULE: { experience: 3000, waterLilies: 12 },
      COURSE: { experience: 3000, waterLilies: 12 },
    });
  });
});
