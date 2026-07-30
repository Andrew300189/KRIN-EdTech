ALTER TABLE "Course"
ADD COLUMN "academySlug" TEXT NOT NULL DEFAULT 'general-english',
ADD COLUMN "pathSlug" TEXT NOT NULL DEFAULT 'core-journey',
ADD COLUMN "stageSlug" TEXT NOT NULL DEFAULT 'all-levels';
