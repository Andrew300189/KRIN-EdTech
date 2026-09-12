-- Automatic learning rewards must be XP-only. Existing historical wallet
-- balances are intentionally preserved; this only prevents future grants.
UPDATE "RewardRule"
SET "coinAmount" = 0
WHERE "coinAmount" <> 0;

UPDATE "Achievement"
SET "coinReward" = 0
WHERE "coinReward" <> 0;
