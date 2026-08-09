-- Course lifecycle gains explicit review/unpublished states while keeping the
-- existing shared CMS status field and public isPublished compatibility flag.
ALTER TYPE "CmsContentStatus" ADD VALUE IF NOT EXISTS 'REVIEW';
ALTER TYPE "CmsContentStatus" ADD VALUE IF NOT EXISTS 'UNPUBLISHED';

-- Existing courses already have a required instructor. Preserve that history
-- as the creation/update actor before making new audit references mandatory.
ALTER TABLE "Course"
  ADD COLUMN "createdById" TEXT,
  ADD COLUMN "updatedById" TEXT;

UPDATE "Course"
SET "createdById" = "instructorId",
    "updatedById" = "instructorId"
WHERE "createdById" IS NULL OR "updatedById" IS NULL;

ALTER TABLE "Course"
  ALTER COLUMN "createdById" SET NOT NULL,
  ALTER COLUMN "updatedById" SET NOT NULL;

ALTER TABLE "Course"
  ADD CONSTRAINT "Course_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Course_updatedById_fkey"
    FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "Course_createdById_createdAt_idx" ON "Course"("createdById", "createdAt");
CREATE INDEX "Course_updatedById_updatedAt_idx" ON "Course"("updatedById", "updatedAt");
