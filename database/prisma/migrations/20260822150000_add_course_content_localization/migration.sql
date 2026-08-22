-- Relational localization for courses. Canonical learning records keep their
-- identity, access rules and answer logic; these tables contain only the
-- learner-facing language variants.

CREATE TABLE "ContentLocale" (
  "code" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "nativeName" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContentLocale_pkey" PRIMARY KEY ("code")
);

INSERT INTO "ContentLocale" ("code", "displayName", "nativeName", "isActive", "order", "createdAt", "updatedAt")
VALUES
  ('en', 'English', 'English', true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('uk', 'Ukrainian', 'Українська', true, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ru', 'Russian', 'Русский', true, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('es', 'Spanish', 'Español', true, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('fr', 'French', 'Français', true, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('it', 'Italian', 'Italiano', true, 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('de', 'German', 'Deutsch', true, 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('pt', 'Portuguese', 'Português', true, 8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('pl', 'Polish', 'Polski', true, 9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

CREATE INDEX "ContentLocale_isActive_order_idx" ON "ContentLocale"("isActive", "order");

CREATE TABLE "CourseTranslation" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "locale" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "shortDescription" TEXT NOT NULL,
  "fullDescription" TEXT,
  "seoTitle" TEXT,
  "seoDescription" TEXT,
  "seoKeywords" TEXT,
  "learningOutcomes" JSONB,
  "prerequisites" JSONB,
  "contentStatus" "CmsContentStatus" NOT NULL DEFAULT 'DRAFT',
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CourseTranslation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CourseModuleTranslation" (
  "id" TEXT NOT NULL,
  "moduleId" TEXT NOT NULL,
  "locale" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "contentStatus" "CmsContentStatus" NOT NULL DEFAULT 'DRAFT',
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CourseModuleTranslation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LessonTranslation" (
  "id" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "locale" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "phraseOfTheDay" TEXT,
  "motivationalQuote" TEXT,
  "learningObjectives" JSONB,
  "previewText" TEXT,
  "contentStatus" "CmsContentStatus" NOT NULL DEFAULT 'DRAFT',
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LessonTranslation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LessonBlockTranslation" (
  "id" TEXT NOT NULL,
  "lessonBlockId" TEXT NOT NULL,
  "locale" TEXT NOT NULL,
  "title" TEXT,
  "content" JSONB,
  "contentStatus" "CmsContentStatus" NOT NULL DEFAULT 'DRAFT',
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LessonBlockTranslation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExerciseTranslation" (
  "id" TEXT NOT NULL,
  "exerciseId" TEXT NOT NULL,
  "locale" TEXT NOT NULL,
  "instruction" TEXT NOT NULL,
  "question" TEXT NOT NULL,
  "content" JSONB,
  "explanation" TEXT,
  "hint" TEXT,
  "contentStatus" "CmsContentStatus" NOT NULL DEFAULT 'DRAFT',
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExerciseTranslation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CourseTranslation_courseId_locale_key" ON "CourseTranslation"("courseId", "locale");
CREATE UNIQUE INDEX "CourseTranslation_locale_slug_key" ON "CourseTranslation"("locale", "slug");
CREATE INDEX "CourseTranslation_locale_contentStatus_idx" ON "CourseTranslation"("locale", "contentStatus");
CREATE INDEX "CourseTranslation_locale_title_idx" ON "CourseTranslation"("locale", "title");
CREATE UNIQUE INDEX "CourseModuleTranslation_moduleId_locale_key" ON "CourseModuleTranslation"("moduleId", "locale");
CREATE INDEX "CourseModuleTranslation_locale_contentStatus_idx" ON "CourseModuleTranslation"("locale", "contentStatus");
CREATE UNIQUE INDEX "LessonTranslation_lessonId_locale_key" ON "LessonTranslation"("lessonId", "locale");
CREATE UNIQUE INDEX "LessonTranslation_locale_slug_key" ON "LessonTranslation"("locale", "slug");
CREATE INDEX "LessonTranslation_locale_contentStatus_idx" ON "LessonTranslation"("locale", "contentStatus");
CREATE UNIQUE INDEX "LessonBlockTranslation_lessonBlockId_locale_key" ON "LessonBlockTranslation"("lessonBlockId", "locale");
CREATE INDEX "LessonBlockTranslation_locale_contentStatus_idx" ON "LessonBlockTranslation"("locale", "contentStatus");
CREATE UNIQUE INDEX "ExerciseTranslation_exerciseId_locale_key" ON "ExerciseTranslation"("exerciseId", "locale");
CREATE INDEX "ExerciseTranslation_locale_contentStatus_idx" ON "ExerciseTranslation"("locale", "contentStatus");

ALTER TABLE "CourseTranslation"
  ADD CONSTRAINT "CourseTranslation_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "CourseTranslation_locale_fkey" FOREIGN KEY ("locale") REFERENCES "ContentLocale"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CourseModuleTranslation"
  ADD CONSTRAINT "CourseModuleTranslation_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "CourseModule"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "CourseModuleTranslation_locale_fkey" FOREIGN KEY ("locale") REFERENCES "ContentLocale"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LessonTranslation"
  ADD CONSTRAINT "LessonTranslation_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "LessonTranslation_locale_fkey" FOREIGN KEY ("locale") REFERENCES "ContentLocale"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LessonBlockTranslation"
  ADD CONSTRAINT "LessonBlockTranslation_lessonBlockId_fkey" FOREIGN KEY ("lessonBlockId") REFERENCES "LessonBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "LessonBlockTranslation_locale_fkey" FOREIGN KEY ("locale") REFERENCES "ContentLocale"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExerciseTranslation"
  ADD CONSTRAINT "ExerciseTranslation_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ExerciseTranslation_locale_fkey" FOREIGN KEY ("locale") REFERENCES "ContentLocale"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
