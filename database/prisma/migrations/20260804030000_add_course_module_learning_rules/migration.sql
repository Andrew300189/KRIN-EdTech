ALTER TABLE "CourseModule"
  ADD COLUMN "isRequired" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "requiresSequentialCompletion" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "unlockAfterModuleId" TEXT,
  ADD COLUMN "requiredCompletionPercent" INTEGER NOT NULL DEFAULT 100;

ALTER TABLE "CourseModule"
  ADD CONSTRAINT "CourseModule_requiredCompletionPercent_check"
  CHECK ("requiredCompletionPercent" >= 1 AND "requiredCompletionPercent" <= 100);

ALTER TABLE "CourseModule"
  ADD CONSTRAINT "CourseModule_unlockAfterModuleId_fkey"
  FOREIGN KEY ("unlockAfterModuleId") REFERENCES "CourseModule"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "CourseModule_courseId_unlockAfterModuleId_idx"
ON "CourseModule"("courseId", "unlockAfterModuleId");
