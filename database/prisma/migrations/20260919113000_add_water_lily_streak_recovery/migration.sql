-- Water Lilies are a dedicated inventory item and a lapse leaves one
-- recoverable daily streak. Neither value is browser-owned.
ALTER TABLE "UserStreak"
  ADD COLUMN "waterLilyCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "recoverableStreak" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "streakLostAt" TIMESTAMP(3);

-- One record is written only from the final Next action of an authenticated
-- completed lesson session. The unique session key makes retries idempotent.
CREATE TABLE "LessonSessionPerfectStreak" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "learningSessionId" TEXT NOT NULL,
  "firstTryCorrectTotal" INTEGER NOT NULL DEFAULT 0,
  "longestFirstTryRun" INTEGER NOT NULL DEFAULT 0,
  "finalizedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LessonSessionPerfectStreak_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LessonSessionPerfectStreak_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LessonSessionPerfectStreak_lessonId_fkey"
    FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "LessonSessionPerfectStreak_learningSessionId_key"
  ON "LessonSessionPerfectStreak"("learningSessionId");
CREATE INDEX "LessonSessionPerfectStreak_userId_finalizedAt_idx"
  ON "LessonSessionPerfectStreak"("userId", "finalizedAt");
CREATE INDEX "LessonSessionPerfectStreak_userId_lessonId_finalizedAt_idx"
  ON "LessonSessionPerfectStreak"("userId", "lessonId", "finalizedAt");
