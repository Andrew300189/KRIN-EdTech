ALTER TABLE "UserWallet"
ADD COLUMN "exchangeBalanceMinor" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "UserWallet"
ADD CONSTRAINT "UserWallet_exchangeBalanceMinor_check"
CHECK ("exchangeBalanceMinor" >= 0);
