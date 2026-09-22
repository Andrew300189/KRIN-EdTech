CREATE TABLE "DynamicMatchingPairProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "pairId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DynamicMatchingPairProgress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DynamicMatchingPairProgress_userId_exerciseId_pairId_key"
ON "DynamicMatchingPairProgress"("userId", "exerciseId", "pairId");

CREATE INDEX "DynamicMatchingPairProgress_userId_exerciseId_completedAt_idx"
ON "DynamicMatchingPairProgress"("userId", "exerciseId", "completedAt");

ALTER TABLE "DynamicMatchingPairProgress"
ADD CONSTRAINT "DynamicMatchingPairProgress_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DynamicMatchingPairProgress"
ADD CONSTRAINT "DynamicMatchingPairProgress_exerciseId_fkey"
FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
