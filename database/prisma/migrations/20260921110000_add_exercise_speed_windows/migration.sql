-- Server-owned start times make the answer-speed XP bands immune to client
-- clock edits and crafted timeSpentSeconds payloads.
CREATE TABLE "ExerciseSpeedWindow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "activeKey" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExerciseSpeedWindow_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExerciseSpeedWindow_activeKey_key" ON "ExerciseSpeedWindow"("activeKey");
CREATE INDEX "ExerciseSpeedWindow_userId_exerciseId_consumedAt_openedAt_idx" ON "ExerciseSpeedWindow"("userId", "exerciseId", "consumedAt", "openedAt");

ALTER TABLE "ExerciseSpeedWindow"
  ADD CONSTRAINT "ExerciseSpeedWindow_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ExerciseSpeedWindow"
  ADD CONSTRAINT "ExerciseSpeedWindow_exerciseId_fkey"
  FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
