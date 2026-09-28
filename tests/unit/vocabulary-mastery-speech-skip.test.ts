import { prisma } from "@/core/server/prisma";
import { recordExerciseResult } from "@/modules/motivation/services/motivation.service";
import { buildVocabularyMasteryStages } from "@/modules/vocabulary/utils/course-vocabulary-mastery";
import { submitCourseVocabularyMasteryAttempt } from "@/modules/vocabulary/services/course-vocabulary-mastery.service";

jest.mock("@/core/server/prisma", () => ({ prisma: { lesson: { findUnique: jest.fn(), findMany: jest.fn() }, $transaction: jest.fn() } }));
jest.mock("@/modules/courses/services/lesson-access.service", () => ({ canAccessLesson: jest.fn().mockResolvedValue({ allowed: true }) }));
jest.mock("@/modules/motivation/services/motivation.service", () => ({ recordExerciseResult: jest.fn() }));

it("skips a mastery pronunciation stage without granting XP or breaking the streak", async () => {
  const stages = buildVocabularyMasteryStages(["word-1"], ["word-1"]);
  jest.mocked(prisma.lesson.findUnique).mockResolvedValue({
    id: "lesson-1", order: 1, module: { id: "module-1", order: 1, courseId: "course-1" },
    blocks: [{ id: "block-1", type: "VOCABULARY", settings: { engine: "vocabulary-mastery" }, exercises: stages.map((_, index) => ({ id: `exercise-${index}`, order: index + 1, difficulty: 1, basePoints: 1 })) }],
  } as never);
  jest.mocked(prisma.lesson.findMany).mockResolvedValue([{ id: "lesson-1", vocabulary: [{ word: { id: "word-1", lemma: "a bottle of water", britishAudioUrl: null, americanAudioUrl: null, meanings: [{ translation: "пляшка води", definition: "пляшка води" }] } }] }] as never);
  const session = { id: "session-1", status: "IN_PROGRESS", totalItems: 1, correctItems: 0, incorrectItems: 0, items: [{ id: "item-1", payload: { engine: "course-vocabulary-mastery", state: { version: 1, stageIndex: 0, correctInRow: 0, stageKey: stages[0]!.key, selectedWordIds: ["word-1"], missedWordIds: [] } } }] };
  const itemUpdate = jest.fn().mockResolvedValue({});
  const attemptCreate = jest.fn();
  const tx = {
    vocabularyTrainingSession: { findFirst: jest.fn().mockResolvedValue(session), update: jest.fn() },
    vocabularyTrainingItem: { update: itemUpdate },
    exerciseAttempt: { create: attemptCreate },
  };
  jest.mocked(prisma.$transaction).mockImplementation(async (callback: unknown) => (callback as (value: typeof tx) => Promise<unknown>)(tx) as never);

  const result = await submitCourseVocabularyMasteryAttempt("learner-1", "lesson-1", { stageIndex: 0, locale: "uk", skip: true });
  expect(result).toMatchObject({ skipped: true, isCorrect: false, stageCompleted: true, state: { progress: { completedStages: 1 } }, motivationReward: null });
  expect(itemUpdate).toHaveBeenCalled();
  expect(attemptCreate).not.toHaveBeenCalled();
  expect(recordExerciseResult).not.toHaveBeenCalled();
});
