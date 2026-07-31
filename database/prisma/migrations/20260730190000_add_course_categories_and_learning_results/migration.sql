-- Database-backed course categories and richer user lesson state.

CREATE TABLE "CourseCategory" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "icon" TEXT,
  "coverImage" TEXT,
  "order" INTEGER NOT NULL,
  "isPublished" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CourseCategory_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CourseCategory_slug_key" ON "CourseCategory"("slug");
CREATE UNIQUE INDEX "CourseCategory_order_key" ON "CourseCategory"("order");
CREATE INDEX "CourseCategory_isPublished_order_idx" ON "CourseCategory"("isPublished", "order");

INSERT INTO "CourseCategory" ("id", "slug", "title", "description", "order", "isPublished", "createdAt", "updatedAt") VALUES
  ('course-category-general-english', 'general-english', 'General English', 'English for everyday communication across all CEFR levels.', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('course-category-conversational-english', 'conversational-english', 'Conversational English', 'Practical speaking and listening for real conversations.', 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('course-category-business-english', 'business-english', 'Business English', 'English for meetings, correspondence, and professional communication.', 3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('course-category-english-for-it', 'english-for-it', 'English for IT', 'English for software, data, product, and technology teams.', 4, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('course-category-medical-english', 'medical-english', 'Medical English', 'English for healthcare settings and medical communication.', 5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('course-category-legal-english', 'legal-english', 'Legal English', 'English for legal documents and professional legal contexts.', 6, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('course-category-military-english', 'military-english', 'Military English', 'English for military communication and operations.', 7, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('course-category-aviation-english', 'aviation-english', 'Aviation English', 'English for aviation safety and communication.', 8, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('course-category-maritime-english', 'maritime-english', 'Maritime English', 'English for shipping, ports, and maritime operations.', 9, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('course-category-english-for-tourism', 'english-for-tourism', 'English for Tourism', 'English for hospitality, guides, and travel services.', 10, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('course-category-academic-english', 'academic-english', 'Academic English', 'English for research, study, and academic writing.', 11, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('course-category-technical-english', 'technical-english', 'Technical English', 'English for engineering and technical documentation.', 12, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('course-category-english-for-exams', 'english-for-exams', 'English for Exams', 'Targeted preparation for English language examinations.', 13, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('course-category-english-for-travel', 'english-for-travel', 'English for Travel', 'Practical English for independent travel.', 14, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('course-category-english-for-work', 'english-for-work', 'English for Work', 'Workplace English for a wide range of roles.', 15, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('course-category-english-for-children', 'english-for-children', 'English for Children', 'Age-appropriate English learning for children.', 16, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

ALTER TABLE "Course"
  ADD COLUMN "categoryId" TEXT,
  ADD COLUMN "priceAmount" INTEGER,
  ADD COLUMN "priceCurrency" TEXT NOT NULL DEFAULT 'USD',
  ADD COLUMN "learningOutcomes" JSONB,
  ADD COLUMN "prerequisites" JSONB;

UPDATE "Course"
SET "categoryId" = CASE "academySlug"
  WHEN 'professional-english' THEN 'course-category-english-for-work'
  WHEN 'grammar-academy' THEN 'course-category-general-english'
  WHEN 'vocabulary-academy' THEN 'course-category-general-english'
  ELSE 'course-category-general-english'
END;

ALTER TABLE "Course"
  ALTER COLUMN "categoryId" SET NOT NULL,
  ADD CONSTRAINT "Course_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "CourseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Course_categoryId_isPublished_idx" ON "Course"("categoryId", "isPublished");

ALTER TABLE "LessonProgress"
  ADD COLUMN "currentBlockId" TEXT,
  ADD COLUMN "completionPercent" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "score" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "grade" INTEGER,
  ADD COLUMN "correctAnswers" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "incorrectAnswers" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "ExerciseAttempt"
  ADD COLUMN "lessonId" TEXT,
  ADD COLUMN "idempotencyKey" TEXT;

UPDATE "ExerciseAttempt" a
SET "lessonId" = b."lessonId"
FROM "Exercise" e
INNER JOIN "LessonBlock" b ON b."id" = e."lessonBlockId"
WHERE a."exerciseId" = e."id";

ALTER TABLE "ExerciseAttempt"
  ALTER COLUMN "lessonId" SET NOT NULL,
  ADD CONSTRAINT "ExerciseAttempt_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "ExerciseAttempt_userId_exerciseId_idempotencyKey_key" ON "ExerciseAttempt"("userId", "exerciseId", "idempotencyKey");
CREATE INDEX "ExerciseAttempt_lessonId_createdAt_idx" ON "ExerciseAttempt"("lessonId", "createdAt");

CREATE TABLE "HomeworkSubmission" (
  "id" TEXT NOT NULL,
  "lessonBlockId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "answers" JSONB,
  "score" INTEGER NOT NULL DEFAULT 0,
  "grade" INTEGER,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "submittedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HomeworkSubmission_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "HomeworkSubmission_lessonBlockId_userId_key" ON "HomeworkSubmission"("lessonBlockId", "userId");
CREATE INDEX "HomeworkSubmission_userId_status_updatedAt_idx" ON "HomeworkSubmission"("userId", "status", "updatedAt");
ALTER TABLE "HomeworkSubmission" ADD CONSTRAINT "HomeworkSubmission_lessonBlockId_fkey" FOREIGN KEY ("lessonBlockId") REFERENCES "LessonBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HomeworkSubmission" ADD CONSTRAINT "HomeworkSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
