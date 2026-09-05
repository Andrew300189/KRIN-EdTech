-- Keep placement-test XP distinct from lesson and achievement rewards in the
-- learner history. The reward itself is idempotent in application code.
ALTER TYPE "ExperienceTransactionType" ADD VALUE IF NOT EXISTS 'PLACEMENT_TEST_COMPLETED';
