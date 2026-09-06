-- Keep paid lesson translations distinct from solution purchases in the XP ledger.
ALTER TYPE "ExperienceTransactionType" ADD VALUE IF NOT EXISTS 'TRANSLATION_PURCHASE';
