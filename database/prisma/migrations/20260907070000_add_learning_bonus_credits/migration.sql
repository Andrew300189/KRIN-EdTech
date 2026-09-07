-- Coloured, server-owned credits for learning support. They are not XP and
-- cannot be forged by browser state or spent twice through a retry race.
CREATE TYPE "LearningBonusKind" AS ENUM ('HINT', 'TRANSLATION');

CREATE TABLE "UserLearningBonusBalance" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "hintCredits" INTEGER NOT NULL DEFAULT 0,
  "translationCredits" INTEGER NOT NULL DEFAULT 0,
  "lifetimeHintCreditsEarned" INTEGER NOT NULL DEFAULT 0,
  "lifetimeTranslationCreditsEarned" INTEGER NOT NULL DEFAULT 0,
  "lifetimeHintCreditsSpent" INTEGER NOT NULL DEFAULT 0,
  "lifetimeTranslationCreditsSpent" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "UserLearningBonusBalance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LearningBonusTransaction" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "balanceId" TEXT NOT NULL,
  "kind" "LearningBonusKind" NOT NULL,
  "amount" INTEGER NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "LearningBonusTransaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserLearningBonusBalance_userId_key" ON "UserLearningBonusBalance"("userId");
CREATE UNIQUE INDEX "LearningBonusTransaction_idempotencyKey_key" ON "LearningBonusTransaction"("idempotencyKey");
CREATE INDEX "LearningBonusTransaction_userId_kind_createdAt_idx" ON "LearningBonusTransaction"("userId", "kind", "createdAt");
CREATE INDEX "LearningBonusTransaction_sourceType_sourceId_idx" ON "LearningBonusTransaction"("sourceType", "sourceId");

ALTER TABLE "UserLearningBonusBalance"
  ADD CONSTRAINT "UserLearningBonusBalance_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LearningBonusTransaction"
  ADD CONSTRAINT "LearningBonusTransaction_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LearningBonusTransaction"
  ADD CONSTRAINT "LearningBonusTransaction_balanceId_fkey"
  FOREIGN KEY ("balanceId") REFERENCES "UserLearningBonusBalance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
