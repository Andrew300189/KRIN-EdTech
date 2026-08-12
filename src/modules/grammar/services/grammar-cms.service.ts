import "server-only";

import { Prisma } from "@/generated/prisma-client-payments-runtime";
import { prisma } from "@/core/server/prisma";
import { grammarRuleSchema, grammarRuleUpdateSchema } from "@/modules/grammar/schemas/grammar-cms.schemas";

function asJson(value: string[] | undefined) { return value === undefined ? undefined : value as Prisma.InputJsonValue; }

export async function listGrammarRules(grammarTopicId: string) {
  return prisma.grammarRule.findMany({ where: { grammarTopicId }, orderBy: [{ order: "asc" }, { title: "asc" }] });
}

export async function createGrammarRule(actorId: string, grammarTopicId: string, input: unknown) {
  const value = grammarRuleSchema.parse(input);
  const topic = await prisma.grammarTopic.findUnique({ where: { id: grammarTopicId }, select: { id: true } });
  if (!topic) throw new Error("Grammar topic not found.");
  const last = await prisma.grammarRule.findFirst({ where: { grammarTopicId }, orderBy: { order: "desc" }, select: { order: true } });
  const rule = await prisma.grammarRule.create({ data: { grammarTopicId, title: value.title, explanation: value.explanation, examples: asJson(value.examples), exceptions: asJson(value.exceptions), commonMistakes: asJson(value.commonMistakes), order: value.order ?? (last?.order ?? 0) + 1 } });
  await prisma.contentAuditLog.create({ data: { actorId, action: "GRAMMAR_RULE_CREATED", entityType: "GrammarRule", entityId: rule.id, metadata: { grammarTopicId } } });
  return rule;
}

export async function updateGrammarRule(actorId: string, grammarTopicId: string, ruleId: string, input: unknown) {
  const value = grammarRuleUpdateSchema.parse(input);
  const rule = await prisma.grammarRule.findFirst({ where: { id: ruleId, grammarTopicId }, select: { id: true } });
  if (!rule) throw new Error("Grammar rule not found.");
  const updated = await prisma.grammarRule.update({ where: { id: rule.id }, data: { ...(value.title !== undefined ? { title: value.title } : {}), ...(value.explanation !== undefined ? { explanation: value.explanation } : {}), ...(value.examples !== undefined ? { examples: asJson(value.examples) } : {}), ...(value.exceptions !== undefined ? { exceptions: asJson(value.exceptions) } : {}), ...(value.commonMistakes !== undefined ? { commonMistakes: asJson(value.commonMistakes) } : {}), ...(value.order !== undefined ? { order: value.order } : {}) } });
  await prisma.contentAuditLog.create({ data: { actorId, action: "GRAMMAR_RULE_UPDATED", entityType: "GrammarRule", entityId: rule.id, metadata: { grammarTopicId } } });
  return updated;
}

export async function deleteGrammarRule(actorId: string, grammarTopicId: string, ruleId: string) {
  const deleted = await prisma.grammarRule.deleteMany({ where: { id: ruleId, grammarTopicId } });
  if (!deleted.count) return false;
  await prisma.contentAuditLog.create({ data: { actorId, action: "GRAMMAR_RULE_DELETED", entityType: "GrammarRule", entityId: ruleId, metadata: { grammarTopicId } } });
  return true;
}

export async function listLessonGrammarTopics(lessonId: string) {
  return prisma.lessonGrammarTopic.findMany({ where: { lessonId }, include: { grammarTopic: { select: { id: true, title: true, slug: true, cefrLevel: true, description: true } } }, orderBy: { grammarTopic: { title: "asc" } } });
}

export async function linkGrammarTopicToLesson(actorId: string, lessonId: string, grammarTopicId: string) {
  const [lesson, topic] = await Promise.all([prisma.lesson.findUnique({ where: { id: lessonId }, select: { id: true } }), prisma.grammarTopic.findUnique({ where: { id: grammarTopicId }, select: { id: true } })]);
  if (!lesson || !topic) throw new Error("Lesson or grammar topic not found.");
  const link = await prisma.lessonGrammarTopic.upsert({ where: { lessonId_grammarTopicId: { lessonId, grammarTopicId } }, update: {}, create: { lessonId, grammarTopicId } });
  await prisma.contentAuditLog.create({ data: { actorId, action: "GRAMMAR_TOPIC_LINKED_TO_LESSON", entityType: "LessonGrammarTopic", entityId: link.id, metadata: { lessonId, grammarTopicId } } });
  return link;
}

export async function unlinkGrammarTopicFromLesson(actorId: string, lessonId: string, grammarTopicId: string) {
  const deleted = await prisma.lessonGrammarTopic.deleteMany({ where: { lessonId, grammarTopicId } });
  if (deleted.count) await prisma.contentAuditLog.create({ data: { actorId, action: "GRAMMAR_TOPIC_UNLINKED_FROM_LESSON", entityType: "LessonGrammarTopic", entityId: `${lessonId}:${grammarTopicId}` } });
  return deleted.count > 0;
}

export async function replaceExerciseLearningLinks(actorId: string, exerciseId: string, input: { grammarTopicIds: string[]; wordIds: string[] }) {
  const exercise = await prisma.exercise.findUnique({ where: { id: exerciseId }, select: { id: true } });
  if (!exercise) throw new Error("Exercise not found.");
  const [topics, words] = await Promise.all([prisma.grammarTopic.count({ where: { id: { in: input.grammarTopicIds } } }), prisma.word.count({ where: { id: { in: input.wordIds }, isActive: true } })]);
  if (topics !== input.grammarTopicIds.length || words !== input.wordIds.length) throw new Error("One or more grammar topics or active words were not found.");
  await prisma.$transaction([
    prisma.exerciseGrammarTopic.deleteMany({ where: { exerciseId } }),
    prisma.exerciseVocabulary.deleteMany({ where: { exerciseId } }),
    ...(input.grammarTopicIds.length ? [prisma.exerciseGrammarTopic.createMany({ data: input.grammarTopicIds.map((grammarTopicId) => ({ exerciseId, grammarTopicId })) })] : []),
    ...(input.wordIds.length ? [prisma.exerciseVocabulary.createMany({ data: input.wordIds.map((wordId) => ({ exerciseId, wordId })) })] : []),
  ]);
  await prisma.contentAuditLog.create({ data: { actorId, action: "EXERCISE_LEARNING_LINKS_REPLACED", entityType: "Exercise", entityId: exerciseId, metadata: { grammarTopicIds: input.grammarTopicIds, wordIds: input.wordIds } } });
}

export async function getExerciseLearningLinks(exerciseId: string) {
  return prisma.exercise.findUnique({ where: { id: exerciseId }, select: { grammarLinks: { include: { grammarTopic: { select: { id: true, title: true, cefrLevel: true } } } }, vocabularyLinks: { include: { word: { select: { id: true, lemma: true, cefrLevel: true } } } } } });
}
