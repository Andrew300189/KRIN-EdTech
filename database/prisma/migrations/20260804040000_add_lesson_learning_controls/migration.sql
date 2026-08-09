-- Lesson-level learner flow: explicit prerequisites and automatic next-lesson
-- guidance. Content itself remains in LessonBlock, avoiding a second content
-- store for homework, grammar and video review.
ALTER TABLE "Lesson"
  ADD COLUMN "prerequisiteLessonId" TEXT,
  ADD COLUMN "requiredPrerequisiteCompletion" INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN "autoUnlockNextLesson" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Lesson"
  ADD CONSTRAINT "Lesson_requiredPrerequisiteCompletion_range"
  CHECK ("requiredPrerequisiteCompletion" >= 1 AND "requiredPrerequisiteCompletion" <= 100);

ALTER TABLE "Lesson"
  ADD CONSTRAINT "Lesson_prerequisiteLessonId_fkey"
  FOREIGN KEY ("prerequisiteLessonId") REFERENCES "Lesson"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Lesson_moduleId_prerequisiteLessonId_idx"
  ON "Lesson"("moduleId", "prerequisiteLessonId");
