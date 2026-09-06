-- Keep hint debits visible as their own learner action in the XP ledger.
ALTER TYPE "ExperienceTransactionType" ADD VALUE IF NOT EXISTS 'HINT_PURCHASE';
