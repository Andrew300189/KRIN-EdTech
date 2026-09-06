-- Supports the targeted check for an already-opened solution while an answer
-- is evaluated. Attempt order is already covered by the existing unique key.
CREATE INDEX "ExerciseAttempt_userId_exerciseId_solutionOpened_idx"
ON "ExerciseAttempt"("userId", "exerciseId", "solutionOpened");

-- Supports rebuilding a lesson result at checkpoints and completion.
CREATE INDEX "ExerciseAttempt_userId_lessonId_createdAt_idx"
ON "ExerciseAttempt"("userId", "lessonId", "createdAt");
