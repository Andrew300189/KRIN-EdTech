-- Adds an opt-in grammar-course layer to the canonical course, lesson, block
-- and exercise tables. Existing content defaults to STANDARD and retains its
-- present publication behaviour until it is intentionally upgraded in CMS.
CREATE TYPE "LessonCurriculumRole" AS ENUM ('STANDARD', 'OVERVIEW', 'DEEP_DIVE', 'PRACTICE', 'REVIEW', 'FINAL');
CREATE TYPE "GrammarSkillStatus" AS ENUM ('LEARNING', 'REVIEW_DUE', 'MASTERED');

ALTER TABLE "Lesson"
  ADD COLUMN "curriculumRole" "LessonCurriculumRole" NOT NULL DEFAULT 'STANDARD',
  ADD COLUMN "minimumCompletionScore" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "CourseModule"
  ADD COLUMN "minimumFinalLessonScore" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "LessonBlock"
  ADD COLUMN "learningFragmentKey" TEXT,
  ADD COLUMN "isLearningFragment" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "requiresTwelveExercises" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "GrammarSkill" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GrammarSkill_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LessonGrammarSkill" (
  "id" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "grammarSkillId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LessonGrammarSkill_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LessonBlockGrammarSkill" (
  "id" TEXT NOT NULL,
  "lessonBlockId" TEXT NOT NULL,
  "grammarSkillId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LessonBlockGrammarSkill_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExerciseGrammarSkill" (
  "id" TEXT NOT NULL,
  "exerciseId" TEXT NOT NULL,
  "grammarSkillId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExerciseGrammarSkill_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserGrammarSkillProgress" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "grammarSkillId" TEXT NOT NULL,
  "status" "GrammarSkillStatus" NOT NULL DEFAULT 'LEARNING',
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "correctCount" INTEGER NOT NULL DEFAULT 0,
  "incorrectCount" INTEGER NOT NULL DEFAULT 0,
  "consecutiveErrors" INTEGER NOT NULL DEFAULT 0,
  "masteryPercent" INTEGER NOT NULL DEFAULT 0,
  "nextReviewAt" TIMESTAMP(3),
  "lastPracticedAt" TIMESTAMP(3),
  "masteredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserGrammarSkillProgress_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "UserMistake" ADD COLUMN "grammarSkillId" TEXT;

CREATE UNIQUE INDEX "GrammarSkill_courseId_slug_key" ON "GrammarSkill"("courseId", "slug");
CREATE UNIQUE INDEX "GrammarSkill_courseId_order_key" ON "GrammarSkill"("courseId", "order");
CREATE INDEX "GrammarSkill_courseId_order_idx" ON "GrammarSkill"("courseId", "order");
CREATE UNIQUE INDEX "LessonGrammarSkill_lessonId_grammarSkillId_key" ON "LessonGrammarSkill"("lessonId", "grammarSkillId");
CREATE INDEX "LessonGrammarSkill_grammarSkillId_idx" ON "LessonGrammarSkill"("grammarSkillId");
CREATE UNIQUE INDEX "LessonBlockGrammarSkill_lessonBlockId_grammarSkillId_key" ON "LessonBlockGrammarSkill"("lessonBlockId", "grammarSkillId");
CREATE INDEX "LessonBlockGrammarSkill_grammarSkillId_idx" ON "LessonBlockGrammarSkill"("grammarSkillId");
CREATE UNIQUE INDEX "ExerciseGrammarSkill_exerciseId_grammarSkillId_key" ON "ExerciseGrammarSkill"("exerciseId", "grammarSkillId");
CREATE INDEX "ExerciseGrammarSkill_grammarSkillId_idx" ON "ExerciseGrammarSkill"("grammarSkillId");
CREATE UNIQUE INDEX "UserGrammarSkillProgress_userId_grammarSkillId_key" ON "UserGrammarSkillProgress"("userId", "grammarSkillId");
CREATE INDEX "UserGrammarSkillProgress_userId_status_nextReviewAt_idx" ON "UserGrammarSkillProgress"("userId", "status", "nextReviewAt");
CREATE INDEX "UserGrammarSkillProgress_grammarSkillId_status_idx" ON "UserGrammarSkillProgress"("grammarSkillId", "status");
CREATE INDEX "UserMistake_userId_grammarSkillId_resolvedAt_idx" ON "UserMistake"("userId", "grammarSkillId", "resolvedAt");

ALTER TABLE "GrammarSkill" ADD CONSTRAINT "GrammarSkill_courseId_fkey"
  FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LessonGrammarSkill" ADD CONSTRAINT "LessonGrammarSkill_lessonId_fkey"
  FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LessonGrammarSkill" ADD CONSTRAINT "LessonGrammarSkill_grammarSkillId_fkey"
  FOREIGN KEY ("grammarSkillId") REFERENCES "GrammarSkill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LessonBlockGrammarSkill" ADD CONSTRAINT "LessonBlockGrammarSkill_lessonBlockId_fkey"
  FOREIGN KEY ("lessonBlockId") REFERENCES "LessonBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LessonBlockGrammarSkill" ADD CONSTRAINT "LessonBlockGrammarSkill_grammarSkillId_fkey"
  FOREIGN KEY ("grammarSkillId") REFERENCES "GrammarSkill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExerciseGrammarSkill" ADD CONSTRAINT "ExerciseGrammarSkill_exerciseId_fkey"
  FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExerciseGrammarSkill" ADD CONSTRAINT "ExerciseGrammarSkill_grammarSkillId_fkey"
  FOREIGN KEY ("grammarSkillId") REFERENCES "GrammarSkill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserGrammarSkillProgress" ADD CONSTRAINT "UserGrammarSkillProgress_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserGrammarSkillProgress" ADD CONSTRAINT "UserGrammarSkillProgress_grammarSkillId_fkey"
  FOREIGN KEY ("grammarSkillId") REFERENCES "GrammarSkill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserMistake" ADD CONSTRAINT "UserMistake_grammarSkillId_fkey"
  FOREIGN KEY ("grammarSkillId") REFERENCES "GrammarSkill"("id") ON DELETE SET NULL ON UPDATE CASCADE;
