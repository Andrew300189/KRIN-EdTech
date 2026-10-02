BEGIN;

-- The previous cut-over subtracted unranked rewards from a mixed balance
-- snapshot. Once that subtraction hit zero, legitimate exercise XP could be
-- lost from the ranking too. Rebuild only the ranking column from the
-- immutable XP ledger; spendable XP, coins and transaction history stay put.
LOCK TABLE "ExperienceTransaction" IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE "UserLevel" IN SHARE ROW EXCLUSIVE MODE;

WITH verified AS (
  SELECT level."id" AS level_id,
    COALESCE(SUM(
      CASE WHEN xp."type"::text NOT IN ('XP_EXCHANGE', 'REVERSAL')
        AND xp."sourceType" IN (
          'EXERCISE_CORRECT', 'DYNAMIC_MATCHING_PAIR', 'LESSON_COMPLETED',
          'HOMEWORK_COMPLETED', 'VOCABULARY_REVIEW',
          'VOCABULARY_SESSION_COMPLETED', 'WARM_UP_COMPLETED', 'DAILY_GOAL',
          'COURSE_COMPLETED', 'SPACED_REVIEW', 'MISTAKE_REVIEW_RUN',
          'MISTAKE_CORRECTION', 'MISTAKE_ACHIEVEMENT', 'PLACEMENT_TEST',
          'LESSON_LEVEL_BONUS', 'STREAK_QUEST_BOOK'
        )
      THEN GREATEST(0::bigint, COALESCE(xp."amountMinor"::bigint, xp."amount"::bigint * 100))
      ELSE 0::bigint END
    ), 0::numeric) AS earned_minor
  FROM "UserLevel" AS level
  LEFT JOIN "ExperienceTransaction" AS xp ON xp."userId" = level."userId"
  GROUP BY level."id"
)
UPDATE "UserLevel" AS level
SET "leaderboardExperienceMinor" = LEAST(2147483647::numeric, verified.earned_minor)::integer
FROM verified
WHERE level."id" = verified.level_id;

-- Keep new server-verified learning rewards in sync with the same source
-- policy. Purchases, random chests, wheel bonuses and XP spending stay out.
CREATE OR REPLACE FUNCTION "incrementLeaderboardExperienceOnReward"()
RETURNS TRIGGER AS $$
DECLARE
  earned_minor bigint;
BEGIN
  earned_minor := COALESCE(NEW."amountMinor"::bigint, NEW."amount"::bigint * 100);
  IF earned_minor > 0
    AND NEW."type"::text NOT IN ('XP_EXCHANGE', 'REVERSAL')
    AND NEW."sourceType" IN (
      'EXERCISE_CORRECT', 'DYNAMIC_MATCHING_PAIR', 'LESSON_COMPLETED',
      'HOMEWORK_COMPLETED', 'VOCABULARY_REVIEW',
      'VOCABULARY_SESSION_COMPLETED', 'WARM_UP_COMPLETED', 'DAILY_GOAL',
      'COURSE_COMPLETED', 'SPACED_REVIEW', 'MISTAKE_REVIEW_RUN',
      'MISTAKE_CORRECTION', 'MISTAKE_ACHIEVEMENT', 'PLACEMENT_TEST',
      'LESSON_LEVEL_BONUS', 'STREAK_QUEST_BOOK'
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
