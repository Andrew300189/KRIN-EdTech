-- Retire the intermediate XP Coin wallet without taking value from learners.
-- A KRIN Coin has the same 100-minor-unit value. Rank XP lives on UserLevel
-- and is intentionally not updated by this coin-only migration.
BEGIN;

CREATE TEMP TABLE "_XpCoinCutover" ON COMMIT DROP AS
SELECT "id", "userId", "balance", "fractionalBalance", "xpCoinBalanceMinor"
FROM "UserWallet"
WHERE "xpCoinBalanceMinor" > 0;

UPDATE "UserWallet" AS wallet
SET "balance" = ((legacy."balance"::bigint * 100 + legacy."fractionalBalance" + legacy."xpCoinBalanceMinor") / 100)::integer,
    "fractionalBalance" = ((legacy."balance"::bigint * 100 + legacy."fractionalBalance" + legacy."xpCoinBalanceMinor") % 100)::integer,
    "xpCoinBalanceMinor" = 0,
    "lifetimeXpCoinsSpentMinor" = wallet."lifetimeXpCoinsSpentMinor" + legacy."xpCoinBalanceMinor",
    "lifetimeEarned" = wallet."lifetimeEarned" + ((legacy."fractionalBalance"::bigint + legacy."xpCoinBalanceMinor") / 100)::integer
FROM "_XpCoinCutover" AS legacy
WHERE wallet."id" = legacy."id";

INSERT INTO "CoinTransaction" (
  "id", "userId", "walletId", "amount", "amountMinor", "balanceBefore", "balanceAfter",
  "balanceBeforeMinor", "balanceAfterMinor", "type", "sourceType", "sourceId",
  "idempotencyKey", "localDate", "description", "createdAt"
)
SELECT
  md5('xp-coin-cutover:' || legacy."userId"), legacy."userId", legacy."id",
  legacy."xpCoinBalanceMinor" / 100, legacy."xpCoinBalanceMinor",
  legacy."balance",
  ((legacy."balance"::bigint * 100 + legacy."fractionalBalance" + legacy."xpCoinBalanceMinor") / 100)::integer,
  (legacy."balance"::bigint * 100 + legacy."fractionalBalance")::integer,
  (legacy."balance"::bigint * 100 + legacy."fractionalBalance" + legacy."xpCoinBalanceMinor")::integer,
  'XP_EXCHANGE', 'XP_COIN_CUTOVER', legacy."userId",
  'xp-coin-cutover:' || legacy."userId", to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD'),
  'Existing XP Coins converted 1:1 to KRIN Coins', now()
FROM "_XpCoinCutover" AS legacy;

UPDATE "UserWallet" SET "xpCoinBalanceMinor" = 0 WHERE "xpCoinBalanceMinor" < 0;

-- An old app instance may still be serving requests during a rolling deploy.
-- Reject new XP Coin writes atomically instead of leaving an invisible balance.
ALTER TABLE "UserWallet"
  ADD CONSTRAINT "UserWallet_retiredXpCoinsZero" CHECK ("xpCoinBalanceMinor" = 0);

COMMIT;
