-- Existing books retain their original level-one rewards. New drops derive a
-- level from the verified streak milestone and persist that level immutably.
ALTER TABLE "StreakQuestBook" ADD COLUMN "level" INTEGER NOT NULL DEFAULT 1;
