-- The original level migration has already run in production. Backfill every
-- existing book from its immutable source milestone before future drops use it.
UPDATE "StreakQuestBook" SET "level" = LEAST("sourceMilestone", 10000);
