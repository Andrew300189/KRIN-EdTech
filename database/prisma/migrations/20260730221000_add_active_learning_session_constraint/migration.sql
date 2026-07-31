-- Prevent concurrent active sessions of the same type for the same lesson/context.
CREATE UNIQUE INDEX "LearningSession_active_unique"
ON "LearningSession" ("userId", "type", (COALESCE("lessonId", '')))
WHERE "status" = 'ACTIVE';
