import { randomInt } from "node:crypto";
import { Prisma } from "@/generated/prisma-client-payments-runtime";
import { prisma } from "@/core/server/prisma";
import {
  SPACED_REVIEW_QUESTION_COUNT,
  isSpacedReviewSettings,
} from "@/modules/lessons/utils/spaced-review";

type Tx = Prisma.TransactionClient;

type ReviewExerciseDraft = {
  type: string;
  engineKey: string;
  variantKey: string;
  instruction: string;
  question: string;
  content: Prisma.JsonValue | null;
  correctAnswer: Prisma.JsonValue;
  alternativeAnswers: Prisma.JsonValue | null;
  explanation: string | null;
  hint: string | null;
  hintsEnabled: boolean;
  difficulty: number;
  timeLimitSeconds: number | null;
  solutionCost: number;
  allowInstantCheck: boolean;
  sourceExerciseId: string | null;
  signature: string;
};

type SourceExercise = Omit<ReviewExerciseDraft, "sourceExerciseId" | "signature"> & { id: string };

const PUBLIC_REVIEW_EXERCISE_SELECT = {
  id: true,
  type: true,
  engineKey: true,
  variantKey: true,
  instruction: true,
  question: true,
  content: true,
  explanation: true,
  hint: true,
  hintsEnabled: true,
  basePoints: true,
  timeLimitSeconds: true,
  solutionCost: true,
  allowInstantCheck: true,
  allowExtraExercise: true,
} as const;

function asInputJson(value: Prisma.JsonValue | null) {
  return value === null ? Prisma.JsonNull : value as Prisma.InputJsonValue;
}

function cloneJson(value: Prisma.JsonValue | null) {
  return value === null ? null : JSON.parse(JSON.stringify(value)) as Prisma.JsonValue;
}

function objectValue(value: Prisma.JsonValue | null) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, Prisma.JsonValue>
    : {};
}

function shuffled<T>(items: readonly T[]) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = randomInt(index + 1);
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function freshGeneratedOrder(used: Set<number>) {
  let value = 0;
  do value = randomInt(1, 2_000_000_000);
  while (used.has(value));
  used.add(value);
  return value;
}

function makeToBeFact(subject: string, form: "am" | "is" | "are", predicate: string) {
  const negative = form === "am" ? "am not" : form === "is" ? "isn't" : "aren't";
  const questionForm = form === "am" ? "Am" : form === "is" ? "Is" : "Are";
  const questionSubject = subject === "I" ? "I" : `${subject.charAt(0).toLowerCase()}${subject.slice(1)}`;
  return {
    affirmative: { answer: form, sentence: `${subject} ${form} ${predicate}.`, topic: "affirmative" },
    negative: { answer: negative, sentence: `${subject} ${negative} ${predicate}.`, topic: "negative" },
    question: { answer: questionForm, sentence: `${questionForm} ${questionSubject} ${predicate}?`, topic: "question" },
  };
}

const TO_BE_FACTS = [
  ["I", "am", "ready for the lesson"], ["I", "am", "from a small town"], ["I", "am", "a beginner"], ["I", "am", "at the library"],
  ["You", "are", "welcome here"], ["You", "are", "on the right page"], ["You", "are", "very patient"], ["You", "are", "early today"],
  ["He", "is", "a talented cook"], ["He", "is", "at the bus stop"], ["He", "is", "twenty years old"], ["He", "is", "interested in music"],
  ["She", "is", "our new neighbour"], ["She", "is", "in the meeting room"], ["She", "is", "happy today"], ["She", "is", "a careful driver"],
  ["It", "is", "warm outside"], ["It", "is", "a useful example"], ["It", "is", "half past seven"], ["It", "is", "rainy this morning"],
  ["We", "are", "ready to begin"], ["We", "are", "in the same group"], ["We", "are", "at home now"], ["We", "are", "good friends"],
  ["They", "are", "from different cities"], ["They", "are", "at the cinema"], ["They", "are", "excited about the trip"], ["They", "are", "new students"],
  ["My sister", "is", "a graphic designer"], ["The dog", "is", "under the table"], ["The keys", "are", "in my bag"], ["The children", "are", "in the garden"],
  ["Our teacher", "is", "very kind"], ["These exercises", "are", "short and clear"], ["The museum", "is", "open today"], ["My parents", "are", "at work"],
] as const;

function wrongToBeForm(answer: string) {
  return ({
    am: "is", is: "are", are: "is", "am not": "isn't", "isn't": "aren't", "aren't": "isn't", Am: "Is", Is: "Are", Are: "Is",
  } as Record<string, string>)[answer] ?? "is";
}

function toBeDrafts(moduleOrder: number): ReviewExerciseDraft[] {
  const modes = moduleOrder === 1
    ? ["affirmative"] as const
    : moduleOrder === 2
      ? ["affirmative", "negative"] as const
      : ["affirmative", "negative", "question"] as const;
  const drafts: ReviewExerciseDraft[] = [];
  for (const [subject, form, predicate] of TO_BE_FACTS) {
    const fact = makeToBeFact(subject, form, predicate);
    for (const mode of modes) {
      const item = fact[mode];
      const forms = mode === "negative" ? ["am not", "isn't", "aren't"] : mode === "question" ? ["Am", "Is", "Are"] : ["am", "is", "are"];
      const tokens = item.sentence.replace(/[.?!]$/u, "").split(" ");
      const wrongSentence = item.sentence.replace(item.answer, wrongToBeForm(item.answer));
      const baseSignature = `to-be:${mode}:${item.sentence}`;
      drafts.push(
        {
          type: "TEXT_INPUT", engineKey: "text-input", variantKey: "SPACED_REVIEW_TO_BE",
          instruction: "Вспомните правило и впишите только нужную форму.",
          question: `Новый пример: ${item.sentence.replace(item.answer, "___")}`,
          content: { ignorePunctuation: true }, correctAnswer: item.answer, alternativeAnswers: null,
          explanation: `Верно: ${item.sentence}`, hint: "Сначала найдите подлежащее и тип предложения.", hintsEnabled: true,
          difficulty: 1, timeLimitSeconds: 20, solutionCost: 2, allowInstantCheck: true, sourceExerciseId: null, signature: `${baseSignature}:input`,
        },
        {
          type: "SINGLE_CHOICE", engineKey: "single-choice", variantKey: "SPACED_REVIEW_TO_BE",
          instruction: "Выберите форму, которая естественно завершает новый пример.",
          question: `Какое слово подходит? ${item.sentence.replace(item.answer, "___")}`,
          content: { options: shuffled(forms) }, correctAnswer: item.answer, alternativeAnswers: null,
          explanation: `Полное предложение: ${item.sentence}`, hint: "Проверьте число и порядок слов.", hintsEnabled: true,
          difficulty: 1, timeLimitSeconds: 18, solutionCost: 2, allowInstantCheck: true, sourceExerciseId: null, signature: `${baseSignature}:choice`,
        },
        {
          type: "SENTENCE_ORDER", engineKey: "sentence-builder", variantKey: "SPACED_REVIEW_TO_BE",
          instruction: "Соберите новое предложение в естественном порядке.", question: "Все слова нужны один раз.",
          content: { options: shuffled(tokens), shuffleOptions: true }, correctAnswer: tokens, alternativeAnswers: null,
          explanation: `Верный порядок: ${item.sentence}`, hint: mode === "question" ? "В вопросе форма to be стоит перед подлежащим." : "Начните с подлежащего.", hintsEnabled: true,
          difficulty: 2, timeLimitSeconds: 28, solutionCost: 2, allowInstantCheck: true, sourceExerciseId: null, signature: `${baseSignature}:order`,
        },
        {
          type: "ERROR_CORRECTION", engineKey: "find-and-correct", variantKey: "SPACED_REVIEW_TO_BE",
          instruction: "Исправьте форму to be в новом предложении.", question: `Исправьте: ${wrongSentence}`,
          content: { ignorePunctuation: true }, correctAnswer: item.sentence, alternativeAnswers: null,
          explanation: `Правильно: ${item.sentence}`, hint: "Сверьте форму to be с подлежащим и типом фразы.", hintsEnabled: true,
          difficulty: 2, timeLimitSeconds: 28, solutionCost: 2, allowInstantCheck: true, sourceExerciseId: null, signature: `${baseSignature}:correction`,
        },
      );
    }
  }
  return drafts;
}

function genericDrafts(source: SourceExercise): ReviewExerciseDraft[] {
  const sourceContent = cloneJson(source.content);
  const sourceOptions = objectValue(source.content).options;
  const shuffledOptions = Array.isArray(sourceOptions)
    ? { ...objectValue(source.content), options: shuffled(sourceOptions) }
    : sourceContent;
  const base = {
    correctAnswer: source.correctAnswer,
    alternativeAnswers: source.alternativeAnswers,
    explanation: source.explanation,
    hint: source.hint,
    hintsEnabled: source.hintsEnabled,
    difficulty: Math.min(10, Math.max(1, source.difficulty)),
    timeLimitSeconds: source.timeLimitSeconds,
    solutionCost: source.solutionCost,
    allowInstantCheck: source.allowInstantCheck,
    sourceExerciseId: source.id,
  };
  return [
    {
      ...base,
      type: source.type,
      engineKey: source.engineKey,
      variantKey: "SPACED_REVIEW_RECALL",
      instruction: `Повторение: ${source.instruction}`,
      question: `Вспомните изученное и решите новый вариант: ${source.question}`,
      content: shuffledOptions,
      signature: `source:${source.id}:recall`,
    },
    {
      ...base,
      type: source.type,
      engineKey: source.engineKey,
      variantKey: "SPACED_REVIEW_APPLY",
      instruction: `Примените правило ещё раз: ${source.instruction}`,
      question: `Новый ракурс на знакомую тему: ${source.question}`,
      content: sourceContent,
      signature: `source:${source.id}:apply`,
    },
    {
      ...base,
      type: source.type,
      engineKey: source.engineKey,
      variantKey: "SPACED_REVIEW_TRANSFER",
      instruction: `Проверьте себя без опоры на предыдущий ответ: ${source.instruction}`,
      question: `Закрепите правило в другой последовательности: ${source.question}`,
      content: shuffledOptions,
      signature: `source:${source.id}:transfer`,
    },
  ];
}

function reviewRunInclude() {
  return {
    items: {
      orderBy: { position: "asc" as const },
      include: { exercise: { select: PUBLIC_REVIEW_EXERCISE_SELECT } },
    },
  };
}

function normaliseReviewRun(run: Awaited<ReturnType<typeof findSpacedReviewRun>>) {
  if (!run) return null;
  return {
    id: run.id,
    status: run.status,
    completedAt: run.completedAt,
    questions: run.items.map((item) => item.exercise),
  };
}

async function findSpacedReviewRun(userId: string, lessonId: string) {
  return prisma.lessonSpacedReviewRun.findUnique({
    where: { userId_lessonId: { userId, lessonId } },
    include: reviewRunInclude(),
  });
}

async function buildSpacedReviewRun(tx: Tx, userId: string, lessonId: string) {
  const lesson = await tx.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      order: true,
      module: {
        select: {
          order: true,
          course: {
            select: {
              id: true,
              slug: true,
              modules: {
                where: { isPublished: true },
                orderBy: { order: "asc" },
                select: {
                  id: true,
                  lessons: {
                    where: { isPublished: true },
                    orderBy: { order: "asc" },
                    select: { id: true },
                  },
                },
              },
            },
          },
        },
      },
      blocks: {
        where: { type: "REVIEW", contentStatus: "PUBLISHED" },
        select: { id: true, settings: true },
      },
    },
  });
  if (!lesson) throw new Error("Lesson not found.");
  const reviewBlock = lesson.blocks.find((block) => isSpacedReviewSettings(block.settings));
  if (!reviewBlock || lesson.order <= 1) throw new Error("This lesson does not have a required review block.");

  const orderedLessons = lesson.module.course.modules.flatMap((module) => module.lessons.map((item) => item.id));
  const currentIndex = orderedLessons.indexOf(lesson.id);
  const earlierLessonIds = currentIndex > 0 ? orderedLessons.slice(0, currentIndex) : [];
  const completedEarlier = earlierLessonIds.length
    ? new Set((await tx.lessonProgress.findMany({
      where: { userId, lessonId: { in: earlierLessonIds }, status: "COMPLETED" },
      select: { lessonId: true },
    })).map((item) => item.lessonId))
    : new Set<string>();
  const sourceLessonIds = earlierLessonIds.filter((id) => completedEarlier.has(id));
  // Content managers can preview an individual later lesson before completing
  // the path. Falling back to earlier course content keeps that preview usable
  // while normal learners still receive only completed topics.
  const eligibleLessonIds = sourceLessonIds.length ? sourceLessonIds : earlierLessonIds;
  const sources = eligibleLessonIds.length
    ? await tx.exercise.findMany({
      where: {
        isGeneratedReview: false,
        contentStatus: "PUBLISHED",
        lessonBlock: { lessonId: { in: eligibleLessonIds }, contentStatus: "PUBLISHED" },
      },
      orderBy: [{ difficulty: "asc" }, { order: "asc" }],
      select: {
        id: true, type: true, engineKey: true, instruction: true, question: true, content: true,
        correctAnswer: true, alternativeAnswers: true, explanation: true, hint: true, hintsEnabled: true,
        difficulty: true, timeLimitSeconds: true, solutionCost: true, allowInstantCheck: true,
      },
    })
    : [];

  const historic = await tx.lessonSpacedReviewRunItem.findMany({
    where: { run: { userId, lesson: { module: { courseId: lesson.module.course.id } } } },
    select: { signature: true },
  });
  const seenSignatures = new Set(historic.map((item) => item.signature));
  const candidates = lesson.module.course.slug === "verb-to-be-masterclass"
    ? toBeDrafts(lesson.module.order)
    : sources.flatMap((source) => genericDrafts(source));
  if (candidates.length < SPACED_REVIEW_QUESTION_COUNT) {
    throw new Error("Add more practice questions to earlier lessons before starting this review.");
  }

  const unseen = candidates.filter((candidate) => !seenSignatures.has(candidate.signature));
  const pool = unseen.length >= SPACED_REVIEW_QUESTION_COUNT ? unseen : candidates;
  const selected = shuffled(pool).slice(0, SPACED_REVIEW_QUESTION_COUNT);
  if (selected.length !== SPACED_REVIEW_QUESTION_COUNT) throw new Error("Unable to prepare ten review questions.");

  const usedOrders = new Set<number>();
  const generated = await Promise.all(selected.map((candidate) => tx.exercise.create({
    data: {
      lessonBlockId: reviewBlock.id,
      type: candidate.type as never,
      engineKey: candidate.engineKey,
      variantKey: candidate.variantKey,
      instruction: candidate.instruction,
      question: candidate.question,
      content: asInputJson(candidate.content),
      correctAnswer: asInputJson(candidate.correctAnswer),
      alternativeAnswers: candidate.alternativeAnswers === null ? Prisma.JsonNull : asInputJson(candidate.alternativeAnswers),
      explanation: candidate.explanation,
      hint: candidate.hint,
      hintsEnabled: candidate.hintsEnabled,
      difficulty: candidate.difficulty,
      basePoints: 1,
      timeLimitSeconds: candidate.timeLimitSeconds,
      solutionCost: candidate.solutionCost,
      allowInstantCheck: candidate.allowInstantCheck,
      allowExtraExercise: false,
      isGeneratedReview: true,
      contentStatus: "PUBLISHED",
      publishedAt: new Date(),
      order: freshGeneratedOrder(usedOrders),
    },
    select: { id: true },
  })));
  return tx.lessonSpacedReviewRun.create({
    data: {
      userId,
      lessonId,
      items: {
        create: generated.map((exercise, index) => ({
          exerciseId: exercise.id,
          sourceExerciseId: selected[index].sourceExerciseId,
          signature: selected[index].signature,
          position: index + 1,
        })),
      },
    },
    include: reviewRunInclude(),
  });
}

/** Starts (or safely resumes) the one deterministic review set for a lesson. */
export async function startSpacedLessonReview(userId: string, lessonId: string) {
  const existing = await findSpacedReviewRun(userId, lessonId);
  if (existing) return normaliseReviewRun(existing);
  try {
    return normaliseReviewRun(await prisma.$transaction((tx) => buildSpacedReviewRun(tx, userId, lessonId)));
  } catch (error) {
    // Two tabs may try to start the same review at once. The unique owner/run
    // key ensures both tabs receive the same persisted ten questions.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const concurrent = await findSpacedReviewRun(userId, lessonId);
      if (concurrent) return normaliseReviewRun(concurrent);
    }
    throw error;
  }
}

export async function getSpacedLessonReview(userId: string, lessonId: string) {
  return normaliseReviewRun(await findSpacedReviewRun(userId, lessonId));
}

/** The completion check is server-owned; a browser cannot mark the review as
 * complete until it has submitted an answer to every generated question. */
export async function completeSpacedLessonReview(userId: string, lessonId: string) {
  return prisma.$transaction(async (tx) => {
    const run = await tx.lessonSpacedReviewRun.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
      include: { items: { select: { exerciseId: true } } },
    });
    if (!run) throw new Error("Start the review before completing it.");
    if (run.status === "COMPLETED") return { completed: true, alreadyCompleted: true };
    const attempted = new Set((await tx.exerciseAttempt.findMany({
      where: { userId, exerciseId: { in: run.items.map((item) => item.exerciseId) } },
      select: { exerciseId: true },
    })).map((attempt) => attempt.exerciseId));
    if (attempted.size < SPACED_REVIEW_QUESTION_COUNT) {
      throw new Error(`Answer all ${SPACED_REVIEW_QUESTION_COUNT} review questions before continuing.`);
    }
    await tx.lessonSpacedReviewRun.update({
      where: { id: run.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    return { completed: true, alreadyCompleted: false };
  });
}

/** Returns whether the generated exercise belongs to this learner. This is
 * used by the standard attempt endpoint before it evaluates an answer. */
export async function learnerOwnsSpacedReviewExercise(userId: string, exerciseId: string) {
  return Boolean(await prisma.lessonSpacedReviewRunItem.findFirst({
    where: { exerciseId, run: { userId } },
    select: { id: true },
  }));
}
