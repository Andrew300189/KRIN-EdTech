-- Rebuild the dedicated exchange balance from the immutable exchange ledger.
-- This includes fractional exchanges made before exchangeBalanceMinor existed.
UPDATE "UserWallet" AS wallet
SET "exchangeBalanceMinor" = COALESCE(exchange_totals.total_minor, 0)
FROM (
  SELECT
    "walletId",
    SUM(COALESCE("amountMinor", "amount" * 100))::INTEGER AS total_minor
  FROM "CoinTransaction"
  WHERE "type" = 'XP_EXCHANGE'
  GROUP BY "walletId"
) AS exchange_totals
WHERE wallet.id = exchange_totals."walletId";
