-- A template is a regular course blueprint, so cloning can preserve modules,
-- lessons and exercises without duplicating a second content hierarchy.
ALTER TABLE "Course" ADD COLUMN "isTemplate" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Course_isTemplate_contentStatus_idx"
ON "Course"("isTemplate", "contentStatus");
