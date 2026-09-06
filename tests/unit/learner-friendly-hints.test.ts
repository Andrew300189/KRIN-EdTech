import { learnerFriendlyHint } from "@/modules/lessons/utils/learner-friendly-hints";

describe("learner-friendly To Be hints", () => {
  const exercise = { engineKey: "single-choice", question: "She ___ happy.", instruction: "Choose one answer.", hint: "Find the subject.", content: { options: ["am", "is", "are"] } };

  it("uses short Russian guidance for the Russian locale", () => {
    expect(learnerFriendlyHint(exercise, "ru")).toBe("Сначала найди, кто в предложении: I — am; he, she, it — is; we, you, they — are.");
  });

  it("uses Ukrainian guidance and keeps English forms unchanged", () => {
    expect(learnerFriendlyHint({ ...exercise, question: "There ___ two books." }, "uk")).toBe("Порахуй предмети: один — there is, багато — there are.");
  });

  it("does not replace a non-To Be hint", () => {
    expect(learnerFriendlyHint({ ...exercise, question: "Choose the correct article.", hint: "Think about the sound.", content: { options: ["a", "an"] } }, "uk")).toBe("Think about the sound.");
  });
});
