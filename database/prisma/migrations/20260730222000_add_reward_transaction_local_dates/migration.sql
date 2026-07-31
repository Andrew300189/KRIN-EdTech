-- Store the learner-local date alongside immutable reward ledger entries.
-- Existing rows predate learner-local-date accounting and must not count against new limits.
ALTER TABLE "ExperienceTransaction"
  ADD COLUMN "localDate" TEXT NOT NULL DEFAULT '1970-01-01';

ALTER TABLE "CoinTransaction"
  ADD COLUMN "localDate" TEXT NOT NULL DEFAULT '1970-01-01';

CREATE INDEX "ExperienceTransaction_userId_type_localDate_idx"
  ON "ExperienceTransaction"("userId", "type", "localDate");

CREATE INDEX "CoinTransaction_userId_type_localDate_idx"
  ON "CoinTransaction"("userId", "type", "localDate");
