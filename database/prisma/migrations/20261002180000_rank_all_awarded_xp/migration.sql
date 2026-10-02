BEGIN;

-- Every positive XP grant is part of the learner's permanent score, whether
-- it came from a lesson, chest, wheel, achievement, booster or adjustment.
-- Spending/exchanging XP adds a negative ledger row and cannot erase points
-- already earned. KRIN Coins live in a separate ledger and never enter here.
LOCK TABLE "ExperienceTransaction" IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE "UserLevel" IN SHARE ROW EXCLUSIVE MODE;

WITH earned AS (
  SELECT level."id" AS level_id,
    COALESCE(SUM(GREATEST(0::bigint, COALESCE(xp."amountMinor"::bigint, xp."amount"::bigint * 100))), 0::numeric) AS earned_minor
  FROM "UserLevel" AS level
  LEFT JOIN "ExperienceTransaction" AS xp ON xp."userId" = level."userId"
  GROUP BY level."id"
)
UPDATE "UserLevel" AS level
SET "leaderboardExperienceMinor" = LEAST(2147483647::numeric, earned.earned_minor)::integer
FROM earned
WHERE level."id" = earned.level_id;

CREATE OR REPLACE FUNCTION "incrementLeaderboardExperienceOnReward"()
RETURNS TRIGGER AS $$
DECLARE
  earned_minor bigint;
BEGIN
  earned_minor := COALESCE(NEW."amountMinor"::bigint, NEW."amount"::bigint * 100);
  IF earned_minor > 0 THEN
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
