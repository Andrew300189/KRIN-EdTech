-- Store the verified OAuth identity directly on the existing user record.
-- Both columns remain nullable to preserve existing email/password accounts.
ALTER TABLE "User"
  ADD COLUMN "provider" TEXT,
  ADD COLUMN "providerAccountId" TEXT;

-- A Google subject may be linked to one user only. PostgreSQL allows multiple
-- NULL pairs, so existing credential-based users remain unaffected.
CREATE UNIQUE INDEX "User_provider_providerAccountId_key"
  ON "User"("provider", "providerAccountId");
