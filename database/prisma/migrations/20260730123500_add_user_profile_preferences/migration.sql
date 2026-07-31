-- Profile fields that are editable by the authenticated user.
ALTER TABLE "User"
  ADD COLUMN "firstName" TEXT,
  ADD COLUMN "lastName" TEXT,
  ADD COLUMN "interfaceLanguage" TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN "timeZone" TEXT NOT NULL DEFAULT 'UTC',
  ADD COLUMN "country" TEXT;
