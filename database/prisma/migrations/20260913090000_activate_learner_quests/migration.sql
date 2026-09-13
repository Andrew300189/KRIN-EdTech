-- Learner achievements are now explicitly activated quests. Existing records
-- were already visible to learners, so retain their historic progress.
ALTER TABLE "UserAchievement"
  ADD COLUMN "activatedAt" TIMESTAMP(3),
  ADD COLUMN "baseline" INTEGER NOT NULL DEFAULT 0;

UPDATE "UserAchievement"
SET "activatedAt" = COALESCE("createdAt", CURRENT_TIMESTAMP)
WHERE "activatedAt" IS NULL;

CREATE INDEX "UserAchievement_userId_activatedAt_idx"
  ON "UserAchievement"("userId", "activatedAt");
