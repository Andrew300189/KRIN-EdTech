-- Persist server-dropped vocabulary quest books. Progress and rewards are
-- never browser owned; sourceMilestone makes every chest drop idempotent.
CREATE TABLE "StreakQuestBook" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "sourceMilestone" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'LOCKED',
  "unlockCost" INTEGER NOT NULL,
  "target" INTEGER NOT NULL,
  "progress" INTEGER NOT NULL DEFAULT 0,
  "baselineCorrectWords" INTEGER NOT NULL DEFAULT 0,
  "experienceReward" INTEGER NOT NULL,
  "coinReward" INTEGER NOT NULL,
  "hintCredits" INTEGER NOT NULL DEFAULT 0,
  "translationCredits" INTEGER NOT NULL DEFAULT 0,
  "droppedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "unlockedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "StreakQuestBook_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StreakQuestBook_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "StreakQuestBook_userId_sourceMilestone_key" ON "StreakQuestBook"("userId", "sourceMilestone");
CREATE INDEX "StreakQuestBook_userId_status_droppedAt_idx" ON "StreakQuestBook"("userId", "status", "droppedAt");
