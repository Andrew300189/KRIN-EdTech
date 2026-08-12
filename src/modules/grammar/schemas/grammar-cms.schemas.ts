import { z } from "zod";

const stringList = z.array(z.string().trim().min(1).max(2000)).max(40).optional();

export const grammarRuleSchema = z.object({
  title: z.string().trim().min(2).max(180),
  explanation: z.string().trim().min(10).max(12000),
  examples: stringList,
  exceptions: stringList,
  commonMistakes: stringList,
  order: z.number().int().min(0).max(10000).optional(),
});

export const grammarRuleUpdateSchema = grammarRuleSchema.partial();
export const lessonGrammarLinkSchema = z.object({ grammarTopicId: z.string().cuid() });
export const exerciseLearningLinksSchema = z.object({
  grammarTopicIds: z.array(z.string().cuid()).max(50).default([]),
  wordIds: z.array(z.string().cuid()).max(100).default([]),
});
