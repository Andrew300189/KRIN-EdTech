-- Course metadata is stored on the canonical Course model so the CMS wizard,
-- catalogue, search and learner surfaces all read the same configuration.
CREATE TYPE "CourseAccessMode" AS ENUM (
  'FREE',
  'SUBSCRIPTION',
  'ONE_TIME_PURCHASE',
  'TEACHER_ASSIGNMENT',
  'HIDDEN'
);

CREATE TYPE "CourseType" AS ENUM (
  'STANDARD',
  'INTENSIVE',
  'EXAM_PREP',
  'PROFESSIONAL',
  'SPECIALIZATION',
  'SKILL'
);

ALTER TABLE "Course"
  ADD COLUMN "courseType" "CourseType" NOT NULL DEFAULT 'STANDARD',
  ADD COLUMN "accessMode" "CourseAccessMode" NOT NULL DEFAULT 'FREE',
  ADD COLUMN "isVisibleInCatalog" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "isVisibleInSearch" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "isVisibleOnHomepage" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "isVisibleInRecommendations" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "isVisibleInLevelBlock" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "isVisibleInAcademy" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "isVisibleInStudentDashboard" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "Course_contentStatus_isVisibleInCatalog_idx" ON "Course"("contentStatus", "isVisibleInCatalog");
CREATE INDEX "Course_contentStatus_isVisibleInSearch_idx" ON "Course"("contentStatus", "isVisibleInSearch");
