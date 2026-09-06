-- Persistent, server-owned reward state.  A DateTime cooldown is used rather
-- than a browser timestamp so a Daily Chest cannot be reopened by changing a
-- device clock or clearing local storage.
ALTER TABLE "User"
  ADD COLUMN "equippedShopTheme" TEXT,
  ADD COLUMN "equippedShopAvatar" TEXT,
  ADD COLUMN "dailyChestClaimedAt" TIMESTAMP(3);

CREATE INDEX "User_dailyChestClaimedAt_idx" ON "User"("dailyChestClaimedAt");

-- Every first lesson completion is a real stage reward. A daily cap here
-- would silently withhold Coins from a learner who completes two lessons.
UPDATE "RewardRule"
SET "coinAmount" = 5, "dailyLimit" = NULL, "isActive" = true
WHERE "eventType" = 'LESSON_COMPLETED';
