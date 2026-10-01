BEGIN;

-- Restore the visibility that the prior privacy migration disabled for all
-- learners. Only active student accounts receive the public defaults.
ALTER TABLE "User" ALTER COLUMN "showInLeaderboard" SET DEFAULT true;
ALTER TABLE "User" ALTER COLUMN "showPublicProfile" SET DEFAULT true;
UPDATE "User"
SET "showInLeaderboard" = true, "showPublicProfile" = true
WHERE "role" = 'STUDENT' AND "isBlocked" = false AND "deletedAt" IS NULL;

-- Historical ×1.0 rolls (and tiny rounded-to-zero rolls) gave a zero-XP
-- receipt. Compensate every affected learner once, without modifying the
-- immutable wheel receipt or adding non-learning XP to the leaderboard.
CREATE TEMP TABLE "wheelZeroFix" ON COMMIT DROP AS
SELECT wheel."id" AS "originalId", wheel."userId", wheel."sourceId", wheel."localDate"
FROM "ExperienceTransaction" AS wheel
WHERE wheel."sourceType" = 'LESSON_XP_MULTIPLIER'
  AND wheel."amount" = 0
  AND wheel."description" LIKE 'Lesson XP multiplier | step:%'
  AND NOT EXISTS (
    SELECT 1 FROM "ExperienceTransaction" AS fix
    WHERE fix."idempotencyKey" = 'wheel-zero-fix:' || wheel."id"
  );

INSERT INTO "ExperienceTransaction" (
  "id", "userId", "amount", "amountMinor", "type", "sourceType",
  "sourceId", "idempotencyKey", "localDate", "description", "createdAt"
)
SELECT md5('wheel-zero-fix-row:' || "originalId"), "userId", 1, 100,
  'ACHIEVEMENT_REWARD', 'LESSON_XP_MULTIPLIER_COMPENSATION',
  "sourceId", 'wheel-zero-fix:' || "originalId", "localDate",
  'Compensation for zero-XP wheel ' || "originalId", now()
FROM "wheelZeroFix"
ON CONFLICT ("idempotencyKey") DO NOTHING;

WITH earned AS (
  SELECT "userId", COUNT(*)::integer AS "xp"
  FROM "wheelZeroFix" GROUP BY "userId"
), calculated AS (
  SELECT level."id", level."lifetimeExperience" + earned."xp" AS "nextXp",
    GREATEST(1, floor((sqrt(9::numeric + 4::numeric * (level."lifetimeExperience" + earned."xp") / 25) - 1) / 2)::integer) AS "nextLevel"
  FROM "UserLevel" AS level JOIN earned ON earned."userId" = level."userId"
)
UPDATE "UserLevel" AS level
SET "lifetimeExperience" = calculated."nextXp",
    "level" = calculated."nextLevel",
    "currentExperience" = calculated."nextXp" - 25 * (calculated."nextLevel" - 1) * (calculated."nextLevel" + 2),
    "experienceToNextLevel" = 25 * calculated."nextLevel" * (calculated."nextLevel" + 3) - calculated."nextXp"
FROM calculated WHERE level."id" = calculated."id";

INSERT INTO "UserDailyActivity" (
  "id", "userId", "date", "experienceEarned", "experienceEarnedMinor", "createdAt", "updatedAt"
)
SELECT md5('wheel-zero-day:' || "userId" || ':' || "localDate"), "userId", "localDate",
  COUNT(*)::integer, (COUNT(*) * 100)::integer, now(), now()
FROM "wheelZeroFix" GROUP BY "userId", "localDate"
ON CONFLICT ("userId", "date") DO UPDATE
SET "experienceEarned" = "UserDailyActivity"."experienceEarned" + EXCLUDED."experienceEarned",
    "experienceEarnedMinor" = "UserDailyActivity"."experienceEarnedMinor" + EXCLUDED."experienceEarnedMinor",
    "updatedAt" = now();

COMMIT;
