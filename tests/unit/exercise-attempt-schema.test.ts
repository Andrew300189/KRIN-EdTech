import { submitExerciseSchema } from "@/modules/courses/schemas/content.schemas";

describe("exercise attempt validation", () => {
  it("accepts a resumed card even when an old browser reports days of elapsed time", () => {
    const attempt = submitExerciseSchema.parse({
      answer: "is",
      idempotencyKey: "80a7ad9a-9f24-4fd9-b20c-98f55c28a376",
      timeSpentSeconds: 3 * 86_400,
    });

    expect(attempt.answer).toBe("is");
    expect(attempt).not.toHaveProperty("timeSpentSeconds");
  });

  it("still requires an answer", () => {
    expect(submitExerciseSchema.safeParse({ timeSpentSeconds: 3 * 86_400 }).success).toBe(false);
  });
});
