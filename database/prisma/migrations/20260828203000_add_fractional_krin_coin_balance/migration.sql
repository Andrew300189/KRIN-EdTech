ALTER TABLE "UserWallet"
ADD COLUMN "fractionalBalance" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "CoinTransaction"
ADD COLUMN "amountMinor" INTEGER,
ADD COLUMN "balanceBeforeMinor" INTEGER,
ADD COLUMN "balanceAfterMinor" INTEGER;

ALTER TABLE "UserWallet"
ADD CONSTRAINT "UserWallet_fractionalBalance_check"
CHECK ("fractionalBalance" >= 0 AND "fractionalBalance" < 100);
