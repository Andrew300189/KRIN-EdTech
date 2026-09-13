-- Add quest conditions for answer streaks and lesson-wheel actions, plus a
-- durable reference to an item unlocked by completing a quest.
ALTER TYPE "AchievementConditionType" ADD VALUE IF NOT EXISTS 'CORRECT_ANSWER_STREAK';
ALTER TYPE "AchievementConditionType" ADD VALUE IF NOT EXISTS 'WHEELS_SPUN';

ALTER TABLE "Achievement"
  ADD COLUMN "unlockShopItemId" TEXT;
