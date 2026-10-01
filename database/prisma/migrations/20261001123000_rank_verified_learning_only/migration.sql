BEGIN;

-- Preserve the historical XP Coin cut-over baseline, but remove all known
-- non-learning reward credits from the permanent ranking. Paid boosters were
-- already removed by the preceding migration and must not be subtracted twice.
WITH non_learning AS (
  SELECT "userId", SUM(COALESCE("amountMinor"::bigint, "amount"::bigint * 100)) AS earned_minor
  FROM "ExperienceTransaction"
  WHERE "sourceType" NOT IN (
    'EXERCISE_CORRECT', 'LESSON_COMPLETED', 'HOMEWORK_COMPLETED',
    'VOCABULARY_REVIEW', 'VOCABULARY_SESSION_COMPLETED', 'WARM_UP_COMPLETED',
    'DAILY_GOAL', 'COURSE_COMPLETED', 'SPACED_REVIEW', 'MISTAKE_REVIEW_RUN',
    'MISTAKE_CORRECTION', 'MISTAKE_ACHIEVEMENT', 'PLACEMENT_TEST',
    'LESSON_LEVEL_BONUS', 'SHOP_XP_BOOST', 'XP_EXCHANGE'
  )
    AND "type"::text NOT IN ('XP_EXCHANGE', 'REVERSAL')
    AND COALESCE("amountMinor"::bigint, "amount"::bigint * 100) > 0
  GROUP BY "userId"
)
UPDATE "UserLevel" AS level
SET "leaderboardExperienceMinor" = GREATEST(
  0::bigint, level."leaderboardExperienceMinor"::bigint - non_learning.earned_minor
)::integer
FROM non_learning
WHERE level."userId" = non_learning."userId";

-- New reward types are unranked until explicitly reviewed and added here.
-- KRIN Coin ledger entries never enter this trigger.
CREATE OR REPLACE FUNCTION "incrementLeaderboardExperienceOnReward"()
RETURNS TRIGGER AS $$
DECLARE
  earned_minor bigint;
BEGIN
  earned_minor := COALESCE(NEW."amountMinor"::bigint, NEW."amount"::bigint * 100);
  IF earned_minor > 0
    AND NEW."type"::text NOT IN ('XP_EXCHANGE', 'REVERSAL')
    AND NEW."sourceType" IN (
      'EXERCISE_CORRECT', 'LESSON_COMPLETED', 'HOMEWORK_COMPLETED',
      'VOCABULARY_REVIEW', 'VOCABULARY_SESSION_COMPLETED', 'WARM_UP_COMPLETED',
      'DAILY_GOAL', 'COURSE_COMPLETED', 'SPACED_REVIEW', 'MISTAKE_REVIEW_RUN',
      'MISTAKE_CORRECTION', 'MISTAKE_ACHIEVEMENT', 'PLACEMENT_TEST',
      'LESSON_LEVEL_BONUS'
    )
  THEN
    UPDATE "UserLevel"
    SET "leaderboardExperienceMinor" = LEAST(
      2147483647::bigint,
      "leaderboardExperienceMinor"::bigint + earned_minor
    )::integer
    WHERE "userId" = NEW."userId";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMIT;
