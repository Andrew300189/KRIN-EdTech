-- Saved server-side queues make the mistake-review journey deterministic and
-- prevent a learner from using an arbitrary lesson URL to bypass course locks.
CREATE TYPE "MistakeReviewRunScope" AS ENUM ('COURSE', 'ALL');
CREATE TYPE "MistakeReviewRunStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELED');

ALTER TYPE "AchievementConditionType" ADD VALUE IF NOT EXISTS 'MISTAKES_RESOLVED';
ALTER TYPE "AchievementConditionType" ADD VALUE IF NOT EXISTS 'MISTAKE_REVIEW_RUNS_COMPLETED';

CREATE TABLE "MistakeReviewRun" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "courseId" TEXT,
  "scope" "MistakeReviewRunScope" NOT NULL DEFAULT 'COURSE',
  "status" "MistakeReviewRunStatus" NOT NULL DEFAULT 'ACTIVE',
  "initialMistakeCount" INTEGER NOT NULL,
  "startedFromLessonId" TEXT,
  "completedAt" TIMESTAMP(3),
  "awardedExperience" INTEGER NOT NULL DEFAULT 0,
  "awardedCoins" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MistakeReviewRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MistakeReviewRunItem" (
  "id" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "mistakeId" TEXT NOT NULL,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MistakeReviewRunItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MistakeReviewRunItem_runId_mistakeId_key" ON "MistakeReviewRunItem"("runId", "mistakeId");
CREATE INDEX "MistakeReviewRun_userId_status_createdAt_idx" ON "MistakeReviewRun"("userId", "status", "createdAt");
CREATE INDEX "MistakeReviewRun_courseId_status_idx" ON "MistakeReviewRun"("courseId", "status");
CREATE INDEX "MistakeReviewRunItem_runId_resolvedAt_idx" ON "MistakeReviewRunItem"("runId", "resolvedAt");
CREATE INDEX "MistakeReviewRunItem_mistakeId_idx" ON "MistakeReviewRunItem"("mistakeId");

ALTER TABLE "MistakeReviewRun" ADD CONSTRAINT "MistakeReviewRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MistakeReviewRun" ADD CONSTRAINT "MistakeReviewRun_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MistakeReviewRunItem" ADD CONSTRAINT "MistakeReviewRunItem_runId_fkey" FOREIGN KEY ("runId") REFERENCES "MistakeReviewRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MistakeReviewRunItem" ADD CONSTRAINT "MistakeReviewRunItem_mistakeId_fkey" FOREIGN KEY ("mistakeId") REFERENCES "UserMistake"("id") ON DELETE CASCADE ON UPDATE CASCADE;
