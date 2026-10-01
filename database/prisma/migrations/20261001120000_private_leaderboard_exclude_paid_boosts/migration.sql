-- The public leaderboard requires an explicit opt-in, including for accounts
-- created before this privacy correction. A learner can opt in in settings.
ALTER TABLE "User" ALTER COLUMN "showInLeaderboard" SET DEFAULT false;
UPDATE "User" SET "showInLeaderboard" = false, "showPublicProfile" = false
WHERE "showInLeaderboard" = true OR "showPublicProfile" = true;

-- Paid boosters grant spendable XP but never academic ranking points. Preserve
-- the historic XP Coin cut-over baseline and subtract only booster credits.
UPDATE "UserLevel" AS level
SET "leaderboardExperienceMinor" = GREATEST(
  0::bigint,
  level."leaderboardExperienceMinor"::bigint - boosts.earned_minor
)::integer
FROM (
  SELECT "userId", SUM(COALESCE("amountMinor"::bigint, "amount"::bigint * 100)) AS earned_minor
  FROM "ExperienceTransaction"
  WHERE "sourceType" = 'SHOP_XP_BOOST'
  GROUP BY "userId"
) AS boosts
WHERE level."userId" = boosts."userId";

CREATE OR REPLACE FUNCTION "incrementLeaderboardExperienceOnReward"()
RETURNS TRIGGER AS $$
DECLARE
  earned_minor bigint;
BEGIN
  earned_minor := COALESCE(NEW."amountMinor"::bigint, NEW."amount"::bigint * 100);
  IF earned_minor > 0
    AND NEW."type"::text NOT IN ('XP_EXCHANGE', 'REVERSAL')
    AND NEW."sourceType" <> 'SHOP_XP_BOOST'
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
