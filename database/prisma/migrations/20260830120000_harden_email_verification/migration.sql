-- Verification credentials are never persisted in plain text. The token itself
-- remains in the existing emailVerificationToken field as a SHA-256 hash; this
-- explicit expiry makes enforcement independent from future TTL configuration.
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "emailVerificationExpiresAt" TIMESTAMP(3);
