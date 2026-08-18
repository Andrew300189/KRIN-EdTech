-- User-level activity covers both legacy credentials sessions and NextAuth JWT sessions.
ALTER TABLE "User"
  ADD COLUMN "lastActiveAt" TIMESTAMP(3);

CREATE INDEX "User_lastActiveAt_idx" ON "User"("lastActiveAt");
