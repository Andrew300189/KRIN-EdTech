-- Earlier lesson players opened speed windows for every hidden task when a
-- block mounted. Retire those pre-opened windows once so each visible task
-- can receive a fresh server-owned timer after the player fix is deployed.
-- No exercise attempts, XP credits, or learner progress are changed.
UPDATE "ExerciseSpeedWindow"
SET "activeKey" = NULL,
    "consumedAt" = CURRENT_TIMESTAMP
WHERE "activeKey" IS NOT NULL
  AND "consumedAt" IS NULL;
