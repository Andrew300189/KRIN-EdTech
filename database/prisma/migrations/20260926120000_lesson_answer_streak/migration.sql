CREATE TABLE "LessonAnswerStreak" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "current" INTEGER NOT NULL DEFAULT 0,
    "best" INTEGER NOT NULL DEFAULT 0,
    "recoverable" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LessonAnswerStreak_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LessonAnswerStreak_userId_lessonId_key" ON "LessonAnswerStreak"("userId", "lessonId");
CREATE INDEX "LessonAnswerStreak_userId_updatedAt_idx" ON "LessonAnswerStreak"("userId", "updatedAt");
ALTER TABLE "LessonAnswerStreak" ADD CONSTRAINT "LessonAnswerStreak_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LessonAnswerStreak" ADD CONSTRAINT "LessonAnswerStreak_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
