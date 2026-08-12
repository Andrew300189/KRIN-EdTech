-- This migration is additive: it preserves existing courses, lessons,
-- attempts, payments and user accounts while adding relational learning
-- metadata and auditable access/progress fields.

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "showInLeaderboard" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "LessonProgress"
  ADD COLUMN IF NOT EXISTS "hintsUsed" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "solutionsOpened" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "totalSeconds" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "UserMistake"
  ADD COLUMN IF NOT EXISTS "mistakeType" TEXT,
  ADD COLUMN IF NOT EXISTS "resolutionCount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "accessStartLessonOrder" INTEGER,
  ADD COLUMN IF NOT EXISTS "accessEndLessonOrder" INTEGER;

ALTER TABLE "Entitlement"
  ADD COLUMN IF NOT EXISTS "accessStartLessonOrder" INTEGER,
  ADD COLUMN IF NOT EXISTS "accessEndLessonOrder" INTEGER;

CREATE TABLE IF NOT EXISTS "GrammarRule" (
  "id" TEXT NOT NULL,
  "grammarTopicId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "explanation" TEXT NOT NULL,
  "examples" JSONB,
  "exceptions" JSONB,
  "commonMistakes" JSONB,
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GrammarRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LessonGrammarTopic" (
  "id" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "grammarTopicId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LessonGrammarTopic_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ExerciseVocabulary" (
  "id" TEXT NOT NULL,
  "exerciseId" TEXT NOT NULL,
  "wordId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExerciseVocabulary_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ExerciseGrammarTopic" (
  "id" TEXT NOT NULL,
  "exerciseId" TEXT NOT NULL,
  "grammarTopicId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExerciseGrammarTopic_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "GrammarRule_grammarTopicId_order_key" ON "GrammarRule"("grammarTopicId", "order");
CREATE INDEX IF NOT EXISTS "GrammarRule_grammarTopicId_title_idx" ON "GrammarRule"("grammarTopicId", "title");
CREATE UNIQUE INDEX IF NOT EXISTS "LessonGrammarTopic_lessonId_grammarTopicId_key" ON "LessonGrammarTopic"("lessonId", "grammarTopicId");
CREATE INDEX IF NOT EXISTS "LessonGrammarTopic_grammarTopicId_idx" ON "LessonGrammarTopic"("grammarTopicId");
CREATE UNIQUE INDEX IF NOT EXISTS "ExerciseVocabulary_exerciseId_wordId_key" ON "ExerciseVocabulary"("exerciseId", "wordId");
CREATE INDEX IF NOT EXISTS "ExerciseVocabulary_wordId_idx" ON "ExerciseVocabulary"("wordId");
CREATE UNIQUE INDEX IF NOT EXISTS "ExerciseGrammarTopic_exerciseId_grammarTopicId_key" ON "ExerciseGrammarTopic"("exerciseId", "grammarTopicId");
CREATE INDEX IF NOT EXISTS "ExerciseGrammarTopic_grammarTopicId_idx" ON "ExerciseGrammarTopic"("grammarTopicId");

DO $$ BEGIN
  ALTER TABLE "GrammarRule" ADD CONSTRAINT "GrammarRule_grammarTopicId_fkey"
    FOREIGN KEY ("grammarTopicId") REFERENCES "GrammarTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "LessonGrammarTopic" ADD CONSTRAINT "LessonGrammarTopic_lessonId_fkey"
    FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "LessonGrammarTopic" ADD CONSTRAINT "LessonGrammarTopic_grammarTopicId_fkey"
    FOREIGN KEY ("grammarTopicId") REFERENCES "GrammarTopic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ExerciseVocabulary" ADD CONSTRAINT "ExerciseVocabulary_exerciseId_fkey"
    FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ExerciseVocabulary" ADD CONSTRAINT "ExerciseVocabulary_wordId_fkey"
    FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ExerciseGrammarTopic" ADD CONSTRAINT "ExerciseGrammarTopic_exerciseId_fkey"
    FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ExerciseGrammarTopic" ADD CONSTRAINT "ExerciseGrammarTopic_grammarTopicId_fkey"
    FOREIGN KEY ("grammarTopicId") REFERENCES "GrammarTopic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
