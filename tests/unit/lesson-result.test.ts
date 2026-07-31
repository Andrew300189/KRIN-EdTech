import { determineLessonAccess } from "@/modules/courses/services/lesson-access.service";
import { calculateLessonResult, gradeForPercent } from "@/modules/lessons/utils/calculate-lesson-result";

describe("lesson result calculation", () => {
  it("uses the latest attempt for each exercise and maps the grade consistently", () => {
    const result = calculateLessonResult([
      { exerciseId: "one", isCorrect: false, scoreAwarded: 0, attemptNumber: 1 },
      { exerciseId: "one", isCorrect: true, scoreAwarded: 2, attemptNumber: 2 },
      { exerciseId: "two", isCorrect: true, scoreAwarded: 3, attemptNumber: 1 },
    ]);
    expect(result).toMatchObject({ correctAnswers: 2, incorrectAnswers: 0, score: 5, completionPercent: 100, grade: 5 });
    expect(gradeForPercent(89)).toBe(4);
    expect(gradeForPercent(74)).toBe(3);
    expect(gradeForPercent(59)).toBe(2);
  });
});

describe("central lesson access rules", () => {
  const paidRule = { courseAccessPlan: "PREMIUM", firstFreeLessonCount: 0, lessonIsFree: false, lessonPosition: 2 };

  it("does not let a free user access a paid lesson", () => {
    expect(determineLessonAccess(null, paidRule)).toMatchObject({ allowed: false, reason: "AUTH_REQUIRED" });
    expect(determineLessonAccess({ role: "STUDENT", subscriptionPlan: "FREE", subscriptionStatus: "ACTIVE", subscriptionCurrentPeriodEnd: null }, paidRule)).toMatchObject({ allowed: false, reason: "PREMIUM_REQUIRED" });
  });

  it("allows explicitly free lessons and active Premium users", () => {
    expect(determineLessonAccess(null, { ...paidRule, lessonIsFree: true })).toMatchObject({ allowed: true });
    expect(determineLessonAccess({ role: "STUDENT", subscriptionPlan: "PREMIUM", subscriptionStatus: "ACTIVE", subscriptionCurrentPeriodEnd: new Date(Date.now() + 60_000) }, paidRule)).toMatchObject({ allowed: true });
  });
});
