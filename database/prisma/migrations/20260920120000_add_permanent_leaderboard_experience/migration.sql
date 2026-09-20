-- Freeze today's leaderboard exactly once, then keep rank independent from
-- any spendable balance. The legacy dashboard score was XP plus held XP Coins
-- at 1,000 XP per XP Coin. KRIN Coin balances are intentionally excluded.
-- The locks make the cut-over atomic: a reward either belongs to this legacy
-- snapshot or is inserted after the trigger below is active.
LOCK TABLE "ExperienceTransaction" IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE "UserLevel" IN SHARE ROW EXCLUSIVE MODE;

ALTER TABLE "UserLevel"
  ADD COLUMN "leaderboardExperienceMinor" INTEGER NOT NULL DEFAULT 0;

-- Snapshot learners with XP Coins. Bigint arithmetic avoids overflow before
-- the value is safely clamped to Prisma's PostgreSQL INTEGER field.
UPDATE "UserLevel" AS level
SET "leaderboardExperienceMinor" = LEAST(
  2147483647::bigint,
  GREATEST(
    0::bigint,
    level."lifetimeExperience"::bigint * 100
      + level."fractionalExperience"::bigint
      + COALESCE(wallet."xpCoinBalanceMinor", 0)::bigint * 1000
  )
)::integer
FROM "UserWallet" AS wallet
WHERE wallet."userId" = level."userId";

-- A level row can exist before a wallet is created. Its old score was simply
-- its XP balance; do not infer any value from existing KRIN Coins.
UPDATE "UserLevel" AS level
SET "leaderboardExperienceMinor" = LEAST(
  2147483647::bigint,
  GREATEST(
    0::bigint,
    level."lifetimeExperience"::bigint * 100 + level."fractionalExperience"::bigint
  )
)::integer
WHERE NOT EXISTS (
  SELECT 1 FROM "UserWallet" AS wallet WHERE wallet."userId" = level."userId"
);

-- The append-only reward ledger, not browser code or mutable balances, owns
-- all future rank gains. Exchange and reversal rows are deliberately ignored
-- even if a later operational refund has a positive amount. `amountMinor`
-- preserves the 1.5 XP review reward.
CREATE OR REPLACE FUNCTION "incrementLeaderboardExperienceOnReward"()
RETURNS TRIGGER AS $$
DECLARE
  earned_minor bigint;
BEGIN
  earned_minor := COALESCE(NEW."amountMinor"::bigint, NEW."amount"::bigint * 100);
  IF earned_minor > 0 AND NEW."type"::text NOT IN ('XP_EXCHANGE', 'REVERSAL') THEN
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

CREATE TRIGGER "ExperienceTransaction_incrementLeaderboardExperience"
AFTER INSERT ON "ExperienceTransaction"
FOR EACH ROW EXECUTE FUNCTION "incrementLeaderboardExperienceOnReward"();
