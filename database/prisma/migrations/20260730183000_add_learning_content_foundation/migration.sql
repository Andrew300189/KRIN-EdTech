-- CEFR content foundation. This migration preserves existing Course and Lesson
-- records by mapping the legacy three-band level and grouping old lessons into
-- one "Imported lessons" module per course.

CREATE TYPE "CefrLevel" AS ENUM ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');
CREATE TYPE "LessonBlockType" AS ENUM (
  'INTRO', 'LEARNING_OBJECTIVES', 'WARM_UP', 'THEORY', 'GRAMMAR', 'VOCABULARY',
  'READING', 'LISTENING', 'VIDEO', 'IMAGE', 'DIALOGUE', 'EXERCISE', 'REVIEW',
  'HOMEWORK', 'QUOTE', 'PHRASE_OF_THE_DAY', 'NEXT_LESSON_PREVIEW', 'BREAK', 'DISCUSSION'
);
CREATE TYPE "ExerciseType" AS ENUM (
  'SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TEXT_INPUT', 'FILL_IN_THE_BLANK', 'MATCHING',
  'WORD_ORDER', 'SENTENCE_ORDER', 'ERROR_CORRECTION', 'SENTENCE_TRANSLATION',
  'TENSE_SELECTION', 'TENSE_TRANSFORMATION', 'SYNONYM_SELECTION', 'ANTONYM_SELECTION',
  'PHRASAL_VERB_MEANING', 'VERB_PREPOSITION', 'TRANSCRIPTION_MATCH',
  'LISTENING_QUESTIONS', 'DICTATION', 'TEXT_RECONSTRUCTION', 'EXTRA_WORDS'
);
CREATE TYPE "LessonProgressStatus" AS ENUM ('STARTED', 'COMPLETED');
CREATE TYPE "UserWordStatus" AS ENUM ('NEW', 'LEARNING', 'REVIEW', 'MASTERED', 'ARCHIVED');

ALTER TYPE "Role" ADD VALUE 'CONTENT_MANAGER';
ALTER TYPE "Role" ADD VALUE 'SUPER_ADMIN';

CREATE TABLE "LanguageLevel" (
  "id" TEXT NOT NULL,
  "code" "CefrLevel" NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  "isPublished" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LanguageLevel_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LanguageLevel_code_key" ON "LanguageLevel"("code");
CREATE UNIQUE INDEX "LanguageLevel_order_key" ON "LanguageLevel"("order");

INSERT INTO "LanguageLevel" ("id", "code", "title", "description", "order", "isPublished", "createdAt", "updatedAt") VALUES
  ('cefr-a1', 'A1', 'Beginner', 'Foundation English for everyday communication.', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cefr-a2', 'A2', 'Elementary', 'Everyday English with greater confidence and range.', 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cefr-b1', 'B1', 'Intermediate', 'Independent communication in familiar situations.', 3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cefr-b2', 'B2', 'Upper-Intermediate', 'Confident communication for study and work.', 4, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cefr-c1', 'C1', 'Advanced', 'Flexible and effective English for complex contexts.', 5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cefr-c2', 'C2', 'Mastery', 'Near-native control, nuance, and precision.', 6, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

ALTER TABLE "Course"
  ADD COLUMN "levelId" TEXT,
  ADD COLUMN "slug" TEXT,
  ADD COLUMN "fullDescription" TEXT,
  ADD COLUMN "coverImage" TEXT,
  ADD COLUMN "trailerVideoUrl" TEXT,
  ADD COLUMN "language" TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN "estimatedDuration" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lessonCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "difficulty" TEXT,
  ADD COLUMN "isPublished" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "firstFreeLessonCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "accessPlan" "SubscriptionPlan" NOT NULL DEFAULT 'FREE';

UPDATE "Course"
SET "levelId" = CASE "level"::TEXT
  WHEN 'BEGINNER' THEN 'cefr-a1'
  WHEN 'INTERMEDIATE' THEN 'cefr-b1'
  WHEN 'ADVANCED' THEN 'cefr-c1'
END,
"slug" = 'legacy-' || "id";

ALTER TABLE "Course"
  ALTER COLUMN "levelId" SET NOT NULL,
  ALTER COLUMN "slug" SET NOT NULL,
  ADD CONSTRAINT "Course_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "LanguageLevel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "Course_slug_key" ON "Course"("slug");
CREATE INDEX "Course_levelId_isPublished_idx" ON "Course"("levelId", "isPublished");
CREATE INDEX "Course_instructorId_createdAt_idx" ON "Course"("instructorId", "createdAt");
CREATE INDEX "Course_accessPlan_isPublished_idx" ON "Course"("accessPlan", "isPublished");

CREATE TABLE "CourseModule" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "order" INTEGER NOT NULL,
  "isPublished" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CourseModule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CourseModule_courseId_order_key" ON "CourseModule"("courseId", "order");
CREATE INDEX "CourseModule_courseId_isPublished_idx" ON "CourseModule"("courseId", "isPublished");
ALTER TABLE "CourseModule" ADD CONSTRAINT "CourseModule_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "CourseModule" ("id", "courseId", "title", "description", "order", "isPublished", "createdAt", "updatedAt")
SELECT 'legacy-module-' || c."id", c."id", 'Imported lessons', 'Lessons created before modules were introduced.', 1, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Course" c
WHERE EXISTS (SELECT 1 FROM "Lesson" l WHERE l."courseId" = c."id");

ALTER TABLE "Lesson"
  ADD COLUMN "moduleId" TEXT,
  ADD COLUMN "slug" TEXT,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "estimatedDuration" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "phraseOfTheDay" TEXT,
  ADD COLUMN "motivationalQuote" TEXT,
  ADD COLUMN "learningObjectives" JSONB,
  ADD COLUMN "previewText" TEXT,
  ADD COLUMN "isPublished" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "isFree" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Lesson"
SET "moduleId" = 'legacy-module-' || "courseId",
    "slug" = 'legacy-' || "id";

-- Existing rows did not have a uniqueness constraint on lesson ordering.
-- Renumber only legacy rows to make the new module ordering invariant safe.
WITH ordered_lessons AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "moduleId" ORDER BY "order", "createdAt", "id") AS next_order
  FROM "Lesson"
)
UPDATE "Lesson" l
SET "order" = ordered_lessons.next_order
FROM ordered_lessons
WHERE l."id" = ordered_lessons."id";

ALTER TABLE "Lesson"
  ALTER COLUMN "moduleId" SET NOT NULL,
  ALTER COLUMN "slug" SET NOT NULL,
  ADD CONSTRAINT "Lesson_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "CourseModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "Lesson_slug_key" ON "Lesson"("slug");
CREATE UNIQUE INDEX "Lesson_moduleId_order_key" ON "Lesson"("moduleId", "order");
CREATE INDEX "Lesson_moduleId_isPublished_idx" ON "Lesson"("moduleId", "isPublished");

UPDATE "Course" c
SET "lessonCount" = (
  SELECT COUNT(*)
  FROM "Lesson" l
  INNER JOIN "CourseModule" m ON m."id" = l."moduleId"
  WHERE m."courseId" = c."id"
);

ALTER TABLE "Lesson" DROP CONSTRAINT "Lesson_courseId_fkey";
ALTER TABLE "Lesson" DROP COLUMN "courseId";

CREATE TABLE "LessonBlock" (
  "id" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "type" "LessonBlockType" NOT NULL,
  "title" TEXT,
  "content" JSONB,
  "settings" JSONB,
  "order" INTEGER NOT NULL,
  "isRequired" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LessonBlock_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LessonBlock_lessonId_order_key" ON "LessonBlock"("lessonId", "order");
CREATE INDEX "LessonBlock_lessonId_type_idx" ON "LessonBlock"("lessonId", "type");
ALTER TABLE "LessonBlock" ADD CONSTRAINT "LessonBlock_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "GrammarTopic" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "cefrLevel" "CefrLevel" NOT NULL,
  "description" TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GrammarTopic_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "GrammarTopic_cefrLevel_slug_key" ON "GrammarTopic"("cefrLevel", "slug");
CREATE INDEX "GrammarTopic_cefrLevel_order_idx" ON "GrammarTopic"("cefrLevel", "order");

CREATE TABLE "Word" (
  "id" TEXT NOT NULL,
  "lemma" TEXT NOT NULL,
  "partOfSpeech" TEXT,
  "cefrLevel" "CefrLevel",
  "britishTranscription" TEXT,
  "americanTranscription" TEXT,
  "britishAudioUrl" TEXT,
  "americanAudioUrl" TEXT,
  "frequencyRank" INTEGER,
  "isPhrasalVerb" BOOLEAN NOT NULL DEFAULT false,
  "isIdiomatic" BOOLEAN NOT NULL DEFAULT false,
  "isSlang" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Word_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Word_lemma_partOfSpeech_key" ON "Word"("lemma", "partOfSpeech");
CREATE INDEX "Word_cefrLevel_lemma_idx" ON "Word"("cefrLevel", "lemma");

CREATE TABLE "WordMeaning" (
  "id" TEXT NOT NULL,
  "wordId" TEXT NOT NULL,
  "definition" TEXT NOT NULL,
  "translation" TEXT,
  "article" TEXT,
  "context" TEXT,
  "usageLabel" TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WordMeaning_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WordMeaning_wordId_order_key" ON "WordMeaning"("wordId", "order");
CREATE INDEX "WordMeaning_wordId_order_idx" ON "WordMeaning"("wordId", "order");
ALTER TABLE "WordMeaning" ADD CONSTRAINT "WordMeaning_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Exercise" (
  "id" TEXT NOT NULL,
  "lessonBlockId" TEXT NOT NULL,
  "type" "ExerciseType" NOT NULL,
  "instruction" TEXT NOT NULL,
  "question" TEXT NOT NULL,
  "content" JSONB,
  "correctAnswer" JSONB NOT NULL,
  "alternativeAnswers" JSONB,
  "explanation" TEXT,
  "hint" TEXT,
  "difficulty" INTEGER NOT NULL DEFAULT 1,
  "basePoints" INTEGER NOT NULL DEFAULT 1,
  "timeLimitSeconds" INTEGER,
  "solutionCost" INTEGER NOT NULL DEFAULT 0,
  "allowInstantCheck" BOOLEAN NOT NULL DEFAULT true,
  "allowExtraExercise" BOOLEAN NOT NULL DEFAULT false,
  "order" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Exercise_lessonBlockId_order_key" ON "Exercise"("lessonBlockId", "order");
CREATE INDEX "Exercise_lessonBlockId_type_idx" ON "Exercise"("lessonBlockId", "type");
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_lessonBlockId_fkey" FOREIGN KEY ("lessonBlockId") REFERENCES "LessonBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "LessonProgress" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "status" "LessonProgressStatus" NOT NULL DEFAULT 'STARTED',
  "completedBlocks" JSONB,
  "activeSeconds" INTEGER NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LessonProgress_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LessonProgress_userId_lessonId_key" ON "LessonProgress"("userId", "lessonId");
CREATE INDEX "LessonProgress_lessonId_status_idx" ON "LessonProgress"("lessonId", "status");
CREATE INDEX "LessonProgress_userId_lastSeenAt_idx" ON "LessonProgress"("userId", "lastSeenAt");
ALTER TABLE "LessonProgress" ADD CONSTRAINT "LessonProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LessonProgress" ADD CONSTRAINT "LessonProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ExerciseAttempt" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "exerciseId" TEXT NOT NULL,
  "submittedAnswer" JSONB NOT NULL,
  "isCorrect" BOOLEAN NOT NULL,
  "scoreAwarded" INTEGER NOT NULL DEFAULT 0,
  "timeSpentSeconds" INTEGER,
  "hintUsed" BOOLEAN NOT NULL DEFAULT false,
  "solutionOpened" BOOLEAN NOT NULL DEFAULT false,
  "attemptNumber" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExerciseAttempt_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ExerciseAttempt_userId_exerciseId_attemptNumber_key" ON "ExerciseAttempt"("userId", "exerciseId", "attemptNumber");
CREATE INDEX "ExerciseAttempt_userId_createdAt_idx" ON "ExerciseAttempt"("userId", "createdAt");
CREATE INDEX "ExerciseAttempt_exerciseId_createdAt_idx" ON "ExerciseAttempt"("exerciseId", "createdAt");
ALTER TABLE "ExerciseAttempt" ADD CONSTRAINT "ExerciseAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExerciseAttempt" ADD CONSTRAINT "ExerciseAttempt_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "UserMistake" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "exerciseId" TEXT,
  "lessonId" TEXT,
  "submittedAnswer" JSONB,
  "expectedAnswer" JSONB,
  "explanation" TEXT,
  "occurrenceCount" INTEGER NOT NULL DEFAULT 1,
  "lastOccurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserMistake_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "UserMistake_userId_resolvedAt_lastOccurredAt_idx" ON "UserMistake"("userId", "resolvedAt", "lastOccurredAt");
CREATE INDEX "UserMistake_exerciseId_userId_idx" ON "UserMistake"("exerciseId", "userId");
ALTER TABLE "UserMistake" ADD CONSTRAINT "UserMistake_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserMistake" ADD CONSTRAINT "UserMistake_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserMistake" ADD CONSTRAINT "UserMistake_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "UserWord" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "wordId" TEXT,
  "customWord" TEXT,
  "customTranslation" TEXT,
  "status" "UserWordStatus" NOT NULL DEFAULT 'NEW',
  "easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
  "intervalDays" INTEGER NOT NULL DEFAULT 0,
  "repetitions" INTEGER NOT NULL DEFAULT 0,
  "nextReviewAt" TIMESTAMP(3),
  "lastReviewedAt" TIMESTAMP(3),
  "correctCount" INTEGER NOT NULL DEFAULT 0,
  "incorrectCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserWord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "UserWord_userId_wordId_key" ON "UserWord"("userId", "wordId");
CREATE INDEX "UserWord_userId_status_nextReviewAt_idx" ON "UserWord"("userId", "status", "nextReviewAt");
ALTER TABLE "UserWord" ADD CONSTRAINT "UserWord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserWord" ADD CONSTRAINT "UserWord_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ContentAuditLog" (
  "id" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContentAuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ContentAuditLog_actorId_createdAt_idx" ON "ContentAuditLog"("actorId", "createdAt");
CREATE INDEX "ContentAuditLog_entityType_entityId_createdAt_idx" ON "ContentAuditLog"("entityType", "entityId", "createdAt");
ALTER TABLE "ContentAuditLog" ADD CONSTRAINT "ContentAuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
