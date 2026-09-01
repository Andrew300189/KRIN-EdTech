-- Keep exercise-solution debits auditable and distinct from XP-to-coin exchanges.
ALTER TYPE "ExperienceTransactionType" ADD VALUE IF NOT EXISTS 'SOLUTION_PURCHASE';
