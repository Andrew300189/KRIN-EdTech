-- Split the former direct XP → KRIN exchange into two balances.
-- Existing KRIN balances remain spendable KRIN Coins and are intentionally
-- not copied: historical exchanges were already converted into regular coins.
ALTER TABLE "UserWallet"
  ADD COLUMN "xpCoinBalanceMinor" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lifetimeXpCoinsEarnedMinor" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lifetimeXpCoinsSpentMinor" INTEGER NOT NULL DEFAULT 0;
