import { determineReviewQuality, isEligibleForMastery, scheduleNextWordReview } from "@/modules/vocabulary/services/review-scheduler";

const now = new Date("2026-07-30T10:00:00.000Z");
const state = { easeFactor: 2.5, intervalDays: 7, repetitions: 4, lapses: 0, masteryLevel: 50 };

describe("vocabulary spaced repetition scheduler", () => {
  it("schedules AGAIN close to now and decreases mastery", () => {
    const result = scheduleNextWordReview(state, "AGAIN", now);
    expect(result).toMatchObject({ status: "LEARNING", intervalDays: 0, repetitions: 0, lapses: 1, masteryLevel: 30 });
    expect(result.nextReviewAt.toISOString()).toBe("2026-07-30T10:10:00.000Z");
  });

  it("applies increasing intervals for HARD, GOOD, and EASY", () => {
    expect(scheduleNextWordReview({ ...state, repetitions: 0, intervalDays: 0 }, "HARD", now).intervalDays).toBe(1);
    expect(scheduleNextWordReview({ ...state, repetitions: 1, intervalDays: 1 }, "GOOD", now).intervalDays).toBe(3);
    expect(scheduleNextWordReview({ ...state, repetitions: 2, intervalDays: 3 }, "EASY", now).intervalDays).toBe(14);
  });

  it("clamps ease and mastery and recognizes mastership only after correct history", () => {
    expect(scheduleNextWordReview({ ...state, easeFactor: 1.3, masteryLevel: 0 }, "AGAIN", now)).toMatchObject({ easeFactor: 1.3, masteryLevel: 0 });
    expect(scheduleNextWordReview({ ...state, easeFactor: 3.5, masteryLevel: 99 }, "EASY", now)).toMatchObject({ easeFactor: 3.5, masteryLevel: 100 });
    expect(isEligibleForMastery({ masteryLevel: 90, repetitions: 5 }, true, true)).toBe(true);
    expect(isEligibleForMastery({ masteryLevel: 90, repetitions: 5 }, false, true)).toBe(false);
  });

  it("derives answer quality on the server from correctness and response time", () => {
    expect(determineReviewQuality(false, "TEXT_INPUT", 1)).toBe("AGAIN");
    expect(determineReviewQuality(true, "TEXT_INPUT", 3)).toBe("EASY");
    expect(determineReviewQuality(true, "TEXT_INPUT", 20)).toBe("HARD");
    expect(determineReviewQuality(true, "TEXT_INPUT", 8)).toBe("GOOD");
  });
});
