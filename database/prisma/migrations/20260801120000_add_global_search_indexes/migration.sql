-- Search indexes for global search service.

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
EXCEPTION
  WHEN insufficient_privilege OR undefined_file THEN
    RAISE NOTICE 'pg_trgm is not available in this environment. Falling back to btree/ILIKE only.';
END;
$$;

CREATE INDEX IF NOT EXISTS "Course_isPublished_updatedAt_idx"
  ON "Course" ("isPublished", "updatedAt");

CREATE INDEX IF NOT EXISTS "Lesson_isPublished_updatedAt_idx"
  ON "Lesson" ("isPublished", "updatedAt");

CREATE INDEX IF NOT EXISTS "HelpArticle_status_locale_publishedAt_idx"
  ON "HelpArticle" ("status", "locale", "publishedAt");

CREATE INDEX IF NOT EXISTS "LearningGroup_teacherId_status_idx"
  ON "LearningGroup" ("teacherId", "status");

CREATE INDEX IF NOT EXISTS "Assignment_teacherId_status_dueAt_idx"
  ON "Assignment" ("teacherId", "status", "dueAt");

CREATE INDEX IF NOT EXISTS "AssignmentSubmission_studentId_status_updatedAt_idx"
  ON "AssignmentSubmission" ("studentId", "status", "updatedAt");

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
    CREATE INDEX IF NOT EXISTS "Course_title_trgm_idx"
      ON "Course" USING GIN ("title" gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS "Course_shortDescription_trgm_idx"
      ON "Course" USING GIN ("description" gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS "Lesson_title_trgm_idx"
      ON "Lesson" USING GIN ("title" gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS "HelpArticle_title_trgm_idx"
      ON "HelpArticle" USING GIN ("title" gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS "LearningGroup_name_trgm_idx"
      ON "LearningGroup" USING GIN ("name" gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS "Assignment_title_trgm_idx"
      ON "Assignment" USING GIN ("title" gin_trgm_ops);
  END IF;
END;
$$;
