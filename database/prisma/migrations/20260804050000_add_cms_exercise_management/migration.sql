ALTER TABLE "Exercise"
  ADD COLUMN "previousVersionId" TEXT,
  ADD COLUMN "hintsEnabled" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Exercise"
  ADD CONSTRAINT "Exercise_previousVersionId_fkey"
  FOREIGN KEY ("previousVersionId") REFERENCES "Exercise"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Exercise_previousVersionId_idx" ON "Exercise"("previousVersionId");

CREATE TABLE "CmsExerciseTemplate" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "sourceExerciseId" TEXT,
  "createdById" TEXT NOT NULL,
  "type" "ExerciseType" NOT NULL,
  "engineKey" TEXT NOT NULL,
  "variantKey" TEXT,
  "instruction" TEXT NOT NULL,
  "question" TEXT NOT NULL,
  "content" JSONB,
  "correctAnswer" JSONB NOT NULL,
  "alternativeAnswers" JSONB,
  "explanation" TEXT,
  "hint" TEXT,
  "hintsEnabled" BOOLEAN NOT NULL DEFAULT true,
  "difficulty" INTEGER NOT NULL DEFAULT 1,
  "basePoints" INTEGER NOT NULL DEFAULT 1,
  "timeLimitSeconds" INTEGER,
  "solutionCost" INTEGER NOT NULL DEFAULT 0,
  "allowInstantCheck" BOOLEAN NOT NULL DEFAULT true,
  "allowExtraExercise" BOOLEAN NOT NULL DEFAULT false,
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CmsExerciseTemplate_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "CmsExerciseTemplate"
  ADD CONSTRAINT "CmsExerciseTemplate_sourceExerciseId_fkey"
  FOREIGN KEY ("sourceExerciseId") REFERENCES "Exercise"("id")
  ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "CmsExerciseTemplate_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "CmsExerciseTemplate_createdById_createdAt_idx" ON "CmsExerciseTemplate"("createdById", "createdAt");
CREATE INDEX "CmsExerciseTemplate_isArchived_updatedAt_idx" ON "CmsExerciseTemplate"("isArchived", "updatedAt");
CREATE INDEX "CmsExerciseTemplate_sourceExerciseId_idx" ON "CmsExerciseTemplate"("sourceExerciseId");
