-- Personal vocabulary, spaced repetition, training sessions, and lesson warm-up.

ALTER TYPE "UserWordStatus" ADD VALUE IF NOT EXISTS 'SUSPENDED';
CREATE TYPE "WordPartOfSpeech" AS ENUM ('NOUN', 'VERB', 'ADJECTIVE', 'ADVERB', 'PRONOUN', 'PREPOSITION', 'CONJUNCTION', 'DETERMINER', 'NUMERAL', 'INTERJECTION', 'PHRASE', 'PHRASAL_VERB', 'IDIOM', 'OTHER');
CREATE TYPE "WordRelationType" AS ENUM ('SYNONYM', 'ANTONYM', 'RELATED', 'PHRASAL_EQUIVALENT', 'FORMAL_EQUIVALENT', 'INFORMAL_EQUIVALENT', 'BRITISH_VARIANT', 'AMERICAN_VARIANT');
CREATE TYPE "LessonVocabularyRole" AS ENUM ('NEW', 'REVIEW', 'OPTIONAL', 'HOMEWORK', 'PHRASE_OF_THE_DAY');
CREATE TYPE "WordReviewQuality" AS ENUM ('AGAIN', 'HARD', 'GOOD', 'EASY');
CREATE TYPE "VocabularyExerciseType" AS ENUM ('WORD_TO_TRANSLATION', 'TRANSLATION_TO_WORD', 'SINGLE_CHOICE', 'TEXT_INPUT', 'MATCH_SYNONYM', 'MATCH_ANTONYM', 'FILL_IN_SENTENCE', 'ARTICLE_SELECTION', 'LISTEN_AND_TYPE', 'PHRASAL_VERB_MEANING', 'COLLOCATION_SELECTION');
CREATE TYPE "VocabularySessionStatus" AS ENUM ('CREATED', 'IN_PROGRESS', 'COMPLETED', 'ABANDONED');
CREATE TYPE "VocabularySessionSource" AS ENUM ('DAILY_REVIEW', 'LESSON_WARM_UP', 'USER_SELECTED', 'DIFFICULT_WORDS', 'NEW_WORDS', 'HOMEWORK');
CREATE TYPE "VocabularyTrainingItemStatus" AS ENUM ('PENDING', 'COMPLETED', 'SKIPPED');

ALTER TABLE "Word" DROP CONSTRAINT IF EXISTS "Word_lemma_partOfSpeech_key";
DROP INDEX IF EXISTS "Word_cefrLevel_lemma_idx";
ALTER TABLE "Word"
  ADD COLUMN "normalizedLemma" TEXT,
  ADD COLUMN "partOfSpeechNew" "WordPartOfSpeech",
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "wordFormation" TEXT,
  ADD COLUMN "etymology" TEXT;

UPDATE "Word"
SET "normalizedLemma" = lower(regexp_replace(replace(replace(trim("lemma"), '’', ''''), '‘', ''''), '[[:space:]]+', ' ', 'g')),
    "partOfSpeechNew" = CASE upper(trim(coalesce("partOfSpeech", '')))
      WHEN 'NOUN' THEN 'NOUN'::"WordPartOfSpeech"
      WHEN 'VERB' THEN 'VERB'::"WordPartOfSpeech"
      WHEN 'ADJECTIVE' THEN 'ADJECTIVE'::"WordPartOfSpeech"
      WHEN 'ADVERB' THEN 'ADVERB'::"WordPartOfSpeech"
      WHEN 'PRONOUN' THEN 'PRONOUN'::"WordPartOfSpeech"
      WHEN 'PREPOSITION' THEN 'PREPOSITION'::"WordPartOfSpeech"
      WHEN 'CONJUNCTION' THEN 'CONJUNCTION'::"WordPartOfSpeech"
      WHEN 'DETERMINER' THEN 'DETERMINER'::"WordPartOfSpeech"
      WHEN 'NUMERAL' THEN 'NUMERAL'::"WordPartOfSpeech"
      WHEN 'INTERJECTION' THEN 'INTERJECTION'::"WordPartOfSpeech"
      WHEN 'PHRASE' THEN 'PHRASE'::"WordPartOfSpeech"
      WHEN 'PHRASAL_VERB' THEN 'PHRASAL_VERB'::"WordPartOfSpeech"
      WHEN 'IDIOM' THEN 'IDIOM'::"WordPartOfSpeech"
      WHEN '' THEN NULL
      ELSE 'OTHER'::"WordPartOfSpeech"
    END;

ALTER TABLE "Word" ALTER COLUMN "normalizedLemma" SET NOT NULL;
ALTER TABLE "Word" DROP COLUMN "partOfSpeech";
ALTER TABLE "Word" RENAME COLUMN "partOfSpeechNew" TO "partOfSpeech";
CREATE UNIQUE INDEX "Word_normalizedLemma_partOfSpeech_key" ON "Word"("normalizedLemma", "partOfSpeech");
CREATE INDEX "Word_normalizedLemma_idx" ON "Word"("normalizedLemma");
CREATE INDEX "Word_cefrLevel_idx" ON "Word"("cefrLevel");
CREATE INDEX "Word_partOfSpeech_idx" ON "Word"("partOfSpeech");

CREATE TABLE "WordRelation" (
  "id" TEXT NOT NULL,
  "sourceWordId" TEXT NOT NULL,
  "targetWordId" TEXT NOT NULL,
  "type" "WordRelationType" NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WordRelation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WordRelation_sourceWordId_targetWordId_type_key" ON "WordRelation"("sourceWordId", "targetWordId", "type");
CREATE INDEX "WordRelation_sourceWordId_type_idx" ON "WordRelation"("sourceWordId", "type");
CREATE INDEX "WordRelation_targetWordId_type_idx" ON "WordRelation"("targetWordId", "type");
ALTER TABLE "WordRelation" ADD CONSTRAINT "WordRelation_sourceWordId_fkey" FOREIGN KEY ("sourceWordId") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WordRelation" ADD CONSTRAINT "WordRelation_targetWordId_fkey" FOREIGN KEY ("targetWordId") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "WordExample" (
  "id" TEXT NOT NULL,
  "wordId" TEXT NOT NULL,
  "sentence" TEXT NOT NULL,
  "translation" TEXT,
  "source" TEXT,
  "cefrLevel" "CefrLevel",
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WordExample_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WordExample_wordId_order_key" ON "WordExample"("wordId", "order");
CREATE INDEX "WordExample_wordId_order_idx" ON "WordExample"("wordId", "order");
ALTER TABLE "WordExample" ADD CONSTRAINT "WordExample_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "WordCollocation" (
  "id" TEXT NOT NULL,
  "wordId" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "translation" TEXT,
  "example" TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WordCollocation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WordCollocation_wordId_order_key" ON "WordCollocation"("wordId", "order");
CREATE INDEX "WordCollocation_wordId_order_idx" ON "WordCollocation"("wordId", "order");
ALTER TABLE "WordCollocation" ADD CONSTRAINT "WordCollocation_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "LessonVocabulary" (
  "id" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "wordId" TEXT NOT NULL,
  "role" "LessonVocabularyRole" NOT NULL DEFAULT 'NEW',
  "order" INTEGER NOT NULL,
  "isRequired" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LessonVocabulary_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LessonVocabulary_lessonId_wordId_key" ON "LessonVocabulary"("lessonId", "wordId");
CREATE UNIQUE INDEX "LessonVocabulary_lessonId_order_key" ON "LessonVocabulary"("lessonId", "order");
CREATE INDEX "LessonVocabulary_wordId_idx" ON "LessonVocabulary"("wordId");
ALTER TABLE "LessonVocabulary" ADD CONSTRAINT "LessonVocabulary_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LessonVocabulary" ADD CONSTRAINT "LessonVocabulary_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UserWord"
  ADD COLUMN "sourceLessonId" TEXT,
  ADD COLUMN "masteryLevel" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lapses" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "isDifficult" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "masteredAt" TIMESTAMP(3),
  ADD COLUMN "archivedAt" TIMESTAMP(3);
ALTER TABLE "UserWord" ADD CONSTRAINT "UserWord_sourceLessonId_fkey" FOREIGN KEY ("sourceLessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;
DROP INDEX IF EXISTS "UserWord_userId_status_nextReviewAt_idx";
CREATE INDEX "UserWord_userId_status_idx" ON "UserWord"("userId", "status");
CREATE INDEX "UserWord_userId_nextReviewAt_idx" ON "UserWord"("userId", "nextReviewAt");
CREATE INDEX "UserWord_userId_masteryLevel_idx" ON "UserWord"("userId", "masteryLevel");
CREATE INDEX "UserWord_wordId_idx" ON "UserWord"("wordId");

CREATE TABLE "UserCustomWord" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "term" TEXT NOT NULL,
  "normalizedTerm" TEXT NOT NULL,
  "translation" TEXT NOT NULL,
  "partOfSpeech" "WordPartOfSpeech",
  "example" TEXT,
  "note" TEXT,
  "status" "UserWordStatus" NOT NULL DEFAULT 'NEW',
  "masteryLevel" INTEGER NOT NULL DEFAULT 0,
  "easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
  "intervalDays" INTEGER NOT NULL DEFAULT 0,
  "repetitions" INTEGER NOT NULL DEFAULT 0,
  "lapses" INTEGER NOT NULL DEFAULT 0,
  "correctCount" INTEGER NOT NULL DEFAULT 0,
  "incorrectCount" INTEGER NOT NULL DEFAULT 0,
  "nextReviewAt" TIMESTAMP(3),
  "lastReviewedAt" TIMESTAMP(3),
  "masteredAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  "isDifficult" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserCustomWord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "UserCustomWord_userId_normalizedTerm_key" ON "UserCustomWord"("userId", "normalizedTerm");
CREATE INDEX "UserCustomWord_userId_status_idx" ON "UserCustomWord"("userId", "status");
CREATE INDEX "UserCustomWord_userId_nextReviewAt_idx" ON "UserCustomWord"("userId", "nextReviewAt");
ALTER TABLE "UserCustomWord" ADD CONSTRAINT "UserCustomWord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve old personal entries while moving them out of the global-word relation.
INSERT INTO "UserCustomWord" ("id", "userId", "term", "normalizedTerm", "translation", "status", "easeFactor", "intervalDays", "repetitions", "correctCount", "incorrectCount", "nextReviewAt", "lastReviewedAt", "createdAt", "updatedAt")
SELECT "id", "userId", "customWord", lower(regexp_replace(replace(replace(trim("customWord"), '’', ''''), '‘', ''''), '[[:space:]]+', ' ', 'g')), "customTranslation", "status", "easeFactor", "intervalDays", "repetitions", "correctCount", "incorrectCount", "nextReviewAt", "lastReviewedAt", "createdAt", "updatedAt"
FROM "UserWord" WHERE "wordId" IS NULL AND "customWord" IS NOT NULL AND "customTranslation" IS NOT NULL
ON CONFLICT ("id") DO NOTHING;
DELETE FROM "UserWord" WHERE "wordId" IS NULL AND "customWord" IS NOT NULL;

CREATE TABLE "WordReviewAttempt" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "userWordId" TEXT,
  "userCustomWordId" TEXT,
  "wordId" TEXT,
  "exerciseType" "VocabularyExerciseType" NOT NULL,
  "submittedAnswer" JSONB NOT NULL,
  "isCorrect" BOOLEAN NOT NULL,
  "quality" "WordReviewQuality" NOT NULL,
  "responseTimeSeconds" INTEGER,
  "previousIntervalDays" INTEGER NOT NULL,
  "nextIntervalDays" INTEGER NOT NULL,
  "previousMasteryLevel" INTEGER NOT NULL,
  "nextMasteryLevel" INTEGER NOT NULL,
  "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WordReviewAttempt_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "WordReviewAttempt_userId_reviewedAt_idx" ON "WordReviewAttempt"("userId", "reviewedAt");
CREATE INDEX "WordReviewAttempt_userWordId_reviewedAt_idx" ON "WordReviewAttempt"("userWordId", "reviewedAt");
CREATE INDEX "WordReviewAttempt_userCustomWordId_reviewedAt_idx" ON "WordReviewAttempt"("userCustomWordId", "reviewedAt");
ALTER TABLE "WordReviewAttempt" ADD CONSTRAINT "WordReviewAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WordReviewAttempt" ADD CONSTRAINT "WordReviewAttempt_userWordId_fkey" FOREIGN KEY ("userWordId") REFERENCES "UserWord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WordReviewAttempt" ADD CONSTRAINT "WordReviewAttempt_userCustomWordId_fkey" FOREIGN KEY ("userCustomWordId") REFERENCES "UserCustomWord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WordReviewAttempt" ADD CONSTRAINT "WordReviewAttempt_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "VocabularyTrainingSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "lessonId" TEXT,
  "status" "VocabularySessionStatus" NOT NULL DEFAULT 'CREATED',
  "source" "VocabularySessionSource" NOT NULL,
  "totalItems" INTEGER NOT NULL DEFAULT 0,
  "completedItems" INTEGER NOT NULL DEFAULT 0,
  "correctItems" INTEGER NOT NULL DEFAULT 0,
  "incorrectItems" INTEGER NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "skippedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VocabularyTrainingSession_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "VocabularyTrainingSession_userId_status_idx" ON "VocabularyTrainingSession"("userId", "status");
CREATE INDEX "VocabularyTrainingSession_userId_source_createdAt_idx" ON "VocabularyTrainingSession"("userId", "source", "createdAt");
CREATE INDEX "VocabularyTrainingSession_lessonId_userId_idx" ON "VocabularyTrainingSession"("lessonId", "userId");
ALTER TABLE "VocabularyTrainingSession" ADD CONSTRAINT "VocabularyTrainingSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VocabularyTrainingSession" ADD CONSTRAINT "VocabularyTrainingSession_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "VocabularyTrainingItem" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "userWordId" TEXT,
  "userCustomWordId" TEXT,
  "exerciseType" "VocabularyExerciseType" NOT NULL,
  "payload" JSONB NOT NULL,
  "answerKey" JSONB NOT NULL,
  "order" INTEGER NOT NULL,
  "status" "VocabularyTrainingItemStatus" NOT NULL DEFAULT 'PENDING',
  "submittedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VocabularyTrainingItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "VocabularyTrainingItem_sessionId_order_key" ON "VocabularyTrainingItem"("sessionId", "order");
CREATE INDEX "VocabularyTrainingItem_sessionId_status_idx" ON "VocabularyTrainingItem"("sessionId", "status");
ALTER TABLE "VocabularyTrainingItem" ADD CONSTRAINT "VocabularyTrainingItem_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "VocabularyTrainingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VocabularyTrainingItem" ADD CONSTRAINT "VocabularyTrainingItem_userWordId_fkey" FOREIGN KEY ("userWordId") REFERENCES "UserWord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VocabularyTrainingItem" ADD CONSTRAINT "VocabularyTrainingItem_userCustomWordId_fkey" FOREIGN KEY ("userCustomWordId") REFERENCES "UserCustomWord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "UserVocabularySettings" (
  "userId" TEXT NOT NULL,
  "dailyGoal" INTEGER NOT NULL DEFAULT 10,
  "maxSessionSize" INTEGER NOT NULL DEFAULT 20,
  "showTranscription" BOOLEAN NOT NULL DEFAULT true,
  "autoplayAudio" BOOLEAN NOT NULL DEFAULT false,
  "pronunciationVariant" TEXT NOT NULL DEFAULT 'BOTH',
  "includeDifficultWords" BOOLEAN NOT NULL DEFAULT true,
  "dailyReminderEnabled" BOOLEAN NOT NULL DEFAULT true,
  "translationLanguage" TEXT NOT NULL DEFAULT 'ru',
  "lastReviewPromptAt" TIMESTAMP(3),
  "reviewPromptDismissedUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserVocabularySettings_pkey" PRIMARY KEY ("userId")
);
ALTER TABLE "UserVocabularySettings" ADD CONSTRAINT "UserVocabularySettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "WarmUpConfiguration" (
  "id" TEXT NOT NULL,
  "minItems" INTEGER NOT NULL DEFAULT 1,
  "maxItems" INTEGER NOT NULL DEFAULT 10,
  "isRequired" BOOLEAN NOT NULL DEFAULT false,
  "maxPreviousWords" INTEGER NOT NULL DEFAULT 3,
  "maxDueWords" INTEGER NOT NULL DEFAULT 3,
  "maxDifficultWords" INTEGER NOT NULL DEFAULT 2,
  "maxGrammarItems" INTEGER NOT NULL DEFAULT 2,
  "timeLimitSeconds" INTEGER NOT NULL DEFAULT 300,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WarmUpConfiguration_pkey" PRIMARY KEY ("id")
);
INSERT INTO "WarmUpConfiguration" ("id", "updatedAt") VALUES ('default', CURRENT_TIMESTAMP);

CREATE TABLE "VocabularyImportLog" (
  "id" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "format" TEXT NOT NULL,
  "totalRows" INTEGER NOT NULL,
  "importedRows" INTEGER NOT NULL,
  "skippedRows" INTEGER NOT NULL,
  "errors" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VocabularyImportLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "VocabularyImportLog_actorId_createdAt_idx" ON "VocabularyImportLog"("actorId", "createdAt");
ALTER TABLE "VocabularyImportLog" ADD CONSTRAINT "VocabularyImportLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
