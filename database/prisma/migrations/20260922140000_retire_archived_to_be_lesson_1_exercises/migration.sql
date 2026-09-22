-- Remove only retired cards from the first lesson of module 1 of the
-- verb-to-be course. Preserve their full content and learner attempts outside
-- the active CMS so progress and XP attribution remain auditable.
CREATE TABLE "RetiredExercise" (
  "id" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "lessonBlockId" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL,
  "retiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RetiredExercise_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RetiredExerciseAttempt" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "exerciseId" TEXT NOT NULL,
  "submittedAnswer" JSONB NOT NULL,
  "isCorrect" BOOLEAN NOT NULL,
  "scoreAwarded" INTEGER NOT NULL,
  "timeSpentSeconds" INTEGER,
  "hintUsed" BOOLEAN NOT NULL,
  "solutionOpened" BOOLEAN NOT NULL,
  "attemptNumber" INTEGER NOT NULL,
  "idempotencyKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RetiredExerciseAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RetiredExercise_lessonId_idx" ON "RetiredExercise"("lessonId");
CREATE INDEX "RetiredExerciseAttempt_userId_lessonId_createdAt_idx" ON "RetiredExerciseAttempt"("userId", "lessonId", "createdAt");
CREATE INDEX "RetiredExerciseAttempt_userId_exerciseId_idx" ON "RetiredExerciseAttempt"("userId", "exerciseId");
ALTER TABLE "RetiredExerciseAttempt" ADD CONSTRAINT "RetiredExerciseAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RetiredExerciseAttempt" ADD CONSTRAINT "RetiredExerciseAttempt_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RetiredExerciseAttempt" ADD CONSTRAINT "RetiredExerciseAttempt_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "RetiredExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TEMP TABLE to_be_lesson_1_retired_exercises ON COMMIT DROP AS
SELECT exercise.id, block."lessonId", exercise."lessonBlockId"
FROM "Exercise" AS exercise
JOIN "LessonBlock" AS block ON block.id = exercise."lessonBlockId"
JOIN "Lesson" AS lesson ON lesson.id = block."lessonId"
JOIN "CourseModule" AS module ON module.id = lesson."moduleId"
JOIN "Course" AS course ON course.id = module."courseId"
WHERE course.slug = 'verb-to-be-masterclass'
  AND module."order" = 1
  AND lesson."order" = 1
  AND exercise."contentStatus" = 'ARCHIVED'::"CmsContentStatus";

INSERT INTO "RetiredExercise" ("id", "lessonId", "lessonBlockId", "snapshot")
SELECT target.id, target."lessonId", target."lessonBlockId", to_jsonb(exercise)
FROM to_be_lesson_1_retired_exercises AS target
JOIN "Exercise" AS exercise ON exercise.id = target.id;

INSERT INTO "RetiredExerciseAttempt" (
  "id", "userId", "lessonId", "exerciseId", "submittedAnswer", "isCorrect",
  "scoreAwarded", "timeSpentSeconds", "hintUsed", "solutionOpened",
  "attemptNumber", "idempotencyKey", "createdAt"
)
SELECT attempt.id, attempt."userId", attempt."lessonId", attempt."exerciseId",
       attempt."submittedAnswer", attempt."isCorrect", attempt."scoreAwarded",
       attempt."timeSpentSeconds", attempt."hintUsed", attempt."solutionOpened",
       attempt."attemptNumber", attempt."idempotencyKey", attempt."createdAt"
FROM "ExerciseAttempt" AS attempt
JOIN to_be_lesson_1_retired_exercises AS target ON target.id = attempt."exerciseId";

DELETE FROM "Exercise" AS exercise
USING to_be_lesson_1_retired_exercises AS target
WHERE exercise.id = target.id;
