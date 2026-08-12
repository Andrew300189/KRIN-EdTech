import { exerciseLearningLinksSchema, grammarRuleSchema, lessonGrammarLinkSchema } from "@/modules/grammar/schemas/grammar-cms.schemas";

describe("grammar CMS schemas", () => {
  it("accepts structured CEFR grammar rules and no arbitrary HTML", () => {
    expect(grammarRuleSchema.parse({ title: "Present simple", explanation: "Use it for regular facts and routines.", examples: ["I work every day."] })).toMatchObject({ title: "Present simple", examples: ["I work every day."] });
  });

  it("requires canonical IDs for lesson and exercise learning links", () => {
    const id = "ck1234567890123456789012345";
    expect(lessonGrammarLinkSchema.safeParse({ grammarTopicId: id }).success).toBe(true);
    expect(exerciseLearningLinksSchema.safeParse({ grammarTopicIds: [id], wordIds: [id] }).success).toBe(true);
    expect(exerciseLearningLinksSchema.safeParse({ grammarTopicIds: ["not-an-id"], wordIds: [] }).success).toBe(false);
  });
});
