-- PostgreSQL requires enum additions to be committed before they can be used.
-- This follows the structural migration that adds MISTAKES_RESOLVED values.
INSERT INTO "Achievement" ("id", "code", "title", "description", "icon", "category", "rarity", "conditionType", "conditionConfig", "experienceReward", "coinReward", "isTrophy", "isHidden", "isActive", "order", "createdAt", "updatedAt") VALUES
  ('achievement-second-look', 'SECOND_LOOK', 'Second look', 'Resolve your first mistake from the review workspace.', 'spark', 'LEARNING', 'COMMON', 'MISTAKES_RESOLVED', '{"target":1}', 20, 2, false, false, true, 81, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('achievement-clarity-keeper', 'CLARITY_KEEPER', 'Clarity keeper', 'Resolve 10 saved mistakes.', 'shield-check', 'LEARNING', 'RARE', 'MISTAKES_RESOLVED', '{"target":10}', 75, 8, true, false, true, 82, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('achievement-clear-path', 'CLEAR_PATH', 'Clear path', 'Clear every mistake in one focused review run.', 'route', 'LEARNING', 'LEGENDARY', 'MISTAKE_REVIEW_RUNS_COMPLETED', '{"target":1}', 250, 25, true, false, true, 83, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('achievement-review-rhythm', 'REVIEW_RHYTHM', 'Review rhythm', 'Complete three focused mistake-review runs.', 'repeat', 'LEARNING', 'EPIC', 'MISTAKE_REVIEW_RUNS_COMPLETED', '{"target":3}', 120, 12, true, false, true, 84, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;
