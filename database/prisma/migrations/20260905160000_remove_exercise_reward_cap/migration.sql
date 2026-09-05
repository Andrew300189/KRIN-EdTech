-- An answer is protected by the per-user/per-exercise idempotency key in the
-- application. A global cap made long lessons stop awarding first attempts.
UPDATE "RewardRule"
SET "dailyLimit" = NULL,
    "weeklyLimit" = NULL,
    "experienceAmount" = 1
WHERE "eventType" = 'EXERCISE_CORRECT';
