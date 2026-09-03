-- Every lesson after the first lesson of a module ends with a protected,
-- learner-specific retrieval-practice block.  Question instances are stored
-- per learner/run so refreshing a page cannot replace work in progress.

CREATE TYPE "LessonSpacedReviewRunStatus" AS ENUM ('ACTIVE', 'COMPLETED');

ALTER TABLE "Exercise"
  ADD COLUMN "isGeneratedReview" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "UserDailyActivity"
  ADD COLUMN "experienceEarnedMinor" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "ExperienceTransaction"
  ADD COLUMN "amountMinor" INTEGER;

ALTER TABLE "UserLevel"
  ADD COLUMN "fractionalExperience" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "LessonSpacedReviewRun" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "status" "LessonSpacedReviewRunStatus" NOT NULL DEFAULT 'ACTIVE',
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "LessonSpacedReviewRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LessonSpacedReviewRunItem" (
  "id" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "exerciseId" TEXT NOT NULL,
  "sourceExerciseId" TEXT,
  "signature" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "LessonSpacedReviewRunItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LessonSpacedReviewRunItem_exerciseId_key" ON "LessonSpacedReviewRunItem"("exerciseId");
CREATE UNIQUE INDEX "LessonSpacedReviewRunItem_runId_position_key" ON "LessonSpacedReviewRunItem"("runId", "position");
CREATE UNIQUE INDEX "LessonSpacedReviewRun_userId_lessonId_key" ON "LessonSpacedReviewRun"("userId", "lessonId");
CREATE INDEX "LessonSpacedReviewRun_userId_lessonId_status_idx" ON "LessonSpacedReviewRun"("userId", "lessonId", "status");
CREATE INDEX "LessonSpacedReviewRun_lessonId_status_idx" ON "LessonSpacedReviewRun"("lessonId", "status");
CREATE INDEX "LessonSpacedReviewRunItem_runId_idx" ON "LessonSpacedReviewRunItem"("runId");
CREATE INDEX "LessonSpacedReviewRunItem_sourceExerciseId_idx" ON "LessonSpacedReviewRunItem"("sourceExerciseId");
CREATE INDEX "Exercise_isGeneratedReview_idx" ON "Exercise"("isGeneratedReview");

ALTER TABLE "LessonSpacedReviewRun"
  ADD CONSTRAINT "LessonSpacedReviewRun_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LessonSpacedReviewRun"
  ADD CONSTRAINT "LessonSpacedReviewRun_lessonId_fkey"
  FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LessonSpacedReviewRunItem"
  ADD CONSTRAINT "LessonSpacedReviewRunItem_runId_fkey"
  FOREIGN KEY ("runId") REFERENCES "LessonSpacedReviewRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LessonSpacedReviewRunItem"
  ADD CONSTRAINT "LessonSpacedReviewRunItem_exerciseId_fkey"
  FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Install the system block in all existing lessons after each module's first
-- lesson.  New lessons receive the same block through the CMS service.
INSERT INTO "LessonBlock" (
  "id", "lessonId", "type", "title", "content", "settings", "order",
  "isRequired", "contentStatus", "publishedAt", "createdAt", "updatedAt"
)
SELECT
  -- Lesson progress uses CUID-shaped block identifiers. Keep the migration
  -- generated identifier compatible with the rest of the progress API.
  'c' || substr(md5(lesson."id"), 1, 24),
  lesson."id",
  'REVIEW'::"LessonBlockType",
  'Повторение',
  NULL,
  '{"system":"SPACED_REVIEW","questionCount":10,"experiencePerCorrect":1.5}'::jsonb,
  COALESCE((SELECT MAX(block."order") + 1 FROM "LessonBlock" block WHERE block."lessonId" = lesson."id"), 1),
  true,
  CASE WHEN lesson."contentStatus" = 'PUBLISHED'::"CmsContentStatus" THEN 'PUBLISHED'::"CmsContentStatus" ELSE 'DRAFT'::"CmsContentStatus" END,
  CASE WHEN lesson."contentStatus" = 'PUBLISHED'::"CmsContentStatus" THEN CURRENT_TIMESTAMP ELSE NULL END,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Lesson" lesson
WHERE lesson."order" > 1
  AND NOT EXISTS (
    SELECT 1
    FROM "LessonBlock" existing
    WHERE existing."lessonId" = lesson."id"
      AND existing."type" = 'REVIEW'::"LessonBlockType"
      AND existing."settings" ->> 'system' = 'SPACED_REVIEW'
  );
