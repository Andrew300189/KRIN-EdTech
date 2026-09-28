import { prisma } from "@/core/server/prisma";
import { recordExerciseResult } from "@/modules/motivation/services/motivation.service";
import { submitBagStoryAttempt } from "@/modules/vocabulary/services/a-bag-story.service";

jest.mock("@/core/server/prisma", () => ({ prisma: { lesson: { findUnique: jest.fn() }, $transaction: jest.fn() } }));
jest.mock("@/modules/courses/services/lesson-access.service", () => ({ canAccessLesson: jest.fn().mockResolvedValue({ allowed: true }) }));
jest.mock("@/modules/motivation/services/motivation.service", () => ({ recordExerciseResult: jest.fn() }));

it("advances a pronunciation card without XP, an incorrect attempt, or a streak mutation", async () => {
  const words = ["rice", "flour", "apples", "carrots", "oranges"].map((food, index) => ({ word: {
    id: `word-${index}`, lemma: `a bag of ${food}`, britishAudioUrl: null, americanAudioUrl: null,
    meanings: [{ translation: `переклад ${index}`, definition: `переклад ${index}` }],
  } }));
  const exercises = Array.from({ length: 25 }, (_, index) => ({ id: `exercise-${index}`, basePoints: 1, difficulty: 1 }));
  jest.mocked(prisma.lesson.findUnique).mockResolvedValue({
    id: "lesson-1", module: { courseId: "course-1" },
    blocks: [{ id: "block-1", settings: { engine: "bag-story", version: 3, reviewAll: false }, exercises }],
    vocabulary: words,
  } as never);
  const itemUpdate = jest.fn().mockResolvedValue({});
  const attemptCreate = jest.fn();
  const session = { id: "session-1", status: "IN_PROGRESS", incorrectItems: 0, items: [{ id: "item-1", payload: { engine: "bag-story", state: { stageIndex: 0, stepIndex: 0, locale: "uk", hadMistake: false, failedLine: false, masteredChunks: [], relearningChunks: [] } } }] };
  const tx = {
    $executeRaw: jest.fn().mockResolvedValue(0),
    vocabularyTrainingSession: { findFirst: jest.fn().mockResolvedValue(session), update: jest.fn() },
    vocabularyTrainingItem: { update: itemUpdate },
    exerciseAttempt: { create: attemptCreate },
  };
  jest.mocked(prisma.$transaction).mockImplementation(async (callback: unknown) => (callback as (value: typeof tx) => Promise<unknown>)(tx) as never);

  const result = await submitBagStoryAttempt("learner-1", "lesson-1", { stageIndex: 0, stepIndex: 0, locale: "uk", answer: "skip", skip: true });
  expect(result).toMatchObject({ skipped: true, isCorrect: false, stageCompleted: true, state: { progress: { completedStages: 1, totalStages: 25 } }, motivationReward: null });
  expect(itemUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ payload: expect.objectContaining({ state: expect.objectContaining({ stageIndex: 1, hadMistake: false }) }) }) }));
  expect(attemptCreate).not.toHaveBeenCalled();
  expect(recordExerciseResult).not.toHaveBeenCalled();
});

it("accepts a two-card legacy-practice block without loading the old 1,885-card run", async () => {
  const words = ["rice", "flour", "apples", "carrots", "oranges"].map((food, index) => ({ word: {
    id: `word-${index}`, lemma: `a bag of ${food}`, britishAudioUrl: null, americanAudioUrl: null,
    meanings: [{ translation: `пакет ${food}`, definition: `пакет ${food}` }],
  } }));
  const blocks = Array.from({ length: 5 }, (_, partIndex) => ({
    id: `short-block-${partIndex}`,
    settings: { engine: "bag-story", version: 3, practiceKind: "LEGACY_PHRASE", practiceRound: 75, partIndex, partCount: 5, stagesPerBlock: 2 },
    exercises: Array.from({ length: 2 }, (_, index) => ({ id: `short-exercise-${partIndex}-${index}`, basePoints: 1, difficulty: 1 })),
  }));
  jest.mocked(prisma.lesson.findUnique).mockResolvedValue({ id: "short-lesson", module: { courseId: "course-1" }, blocks, vocabulary: words } as never);
  const tx = {
    $executeRaw: jest.fn().mockResolvedValue(0),
    vocabularyTrainingSession: { findFirst: jest.fn().mockResolvedValue({ id: "session", status: "IN_PROGRESS", incorrectItems: 0, items: [{ id: "item", payload: { state: { stageIndex: 0, stepIndex: 0, locale: "uk" } } }] }), update: jest.fn() },
    vocabularyTrainingItem: { update: jest.fn().mockResolvedValue({}) },
    exerciseAttempt: { create: jest.fn() },
  };
  jest.mocked(prisma.$transaction).mockImplementation(async (callback: unknown) => (callback as (value: typeof tx) => Promise<unknown>)(tx) as never);

  const result = await submitBagStoryAttempt("learner", "short-lesson", { stageIndex: 0, stepIndex: 0, locale: "uk", answer: "skip", skip: true });
  expect(result).toMatchObject({ skipped: true, state: { progress: { completedStages: 1, totalStages: 10 } } });
  expect(tx.exerciseAttempt.create).not.toHaveBeenCalled();
  expect(recordExerciseResult).not.toHaveBeenCalled();
});
