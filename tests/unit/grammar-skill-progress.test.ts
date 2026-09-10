import { nextGrammarSkillProgress } from "@/modules/grammar/services/grammar-skill-progress.service";

const now = new Date("2026-09-10T10:00:00.000Z");

describe("grammar skill progress", () => {
  it("marks a skill review-due after two consecutive errors", () => {
    const first = nextGrammarSkillProgress(null, false, now);
    const second = nextGrammarSkillProgress(first, false, now);
    expect(first.status).toBe("LEARNING");
    expect(second).toMatchObject({ status: "REVIEW_DUE", consecutiveErrors: 2, nextReviewAt: now });
  });

  it("resets an error streak and reaches mastery after three accurate attempts", () => {
    const first = nextGrammarSkillProgress(null, true, now);
    const second = nextGrammarSkillProgress(first, true, now);
    const third = nextGrammarSkillProgress(second, true, now);
    expect(third).toMatchObject({ status: "MASTERED", masteryPercent: 100, consecutiveErrors: 0, masteredAt: now });
  });
});
