-- Preserve both an uploaded profile photo and a purchased shop avatar. The
-- learner chooses which one is shown; existing accounts retain photo-first
-- behaviour until they make a choice in profile settings.
ALTER TABLE "User"
  ADD COLUMN "avatarDisplayMode" TEXT NOT NULL DEFAULT 'PHOTO';
