-- Server-authoritative learning analytics, rewards, streaks, and achievements.

CREATE TYPE "LearningActivityType" AS ENUM ('LESSON_OPENED', 'LESSON_BLOCK_COMPLETED', 'EXERCISE_SUBMITTED', 'EXERCISE_CORRECT', 'EXERCISE_INCORRECT', 'LESSON_COMPLETED', 'HOMEWORK_COMPLETED', 'WORD_ADDED', 'WORD_REVIEWED', 'VOCABULARY_SESSION_COMPLETED', 'WARM_UP_COMPLETED', 'DAILY_GOAL_COMPLETED', 'COURSE_COMPLETED');
CREATE TYPE "LearningSessionType" AS ENUM ('LESSON', 'VOCABULARY', 'HOMEWORK', 'WARM_UP', 'PRACTICE');
CREATE TYPE "LearningSessionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'EXPIRED');
CREATE TYPE "ExperienceTransactionType" AS ENUM ('LESSON_COMPLETED', 'EXERCISE_CORRECT', 'HOMEWORK_COMPLETED', 'VOCABULARY_REVIEW', 'VOCABULARY_SESSION_COMPLETED', 'WARM_UP_COMPLETED', 'DAILY_GOAL', 'COURSE_COMPLETED', 'ACHIEVEMENT_REWARD', 'ADMIN_ADJUSTMENT', 'REVERSAL');
CREATE TYPE "CoinTransactionType" AS ENUM ('LESSON_REWARD', 'DAILY_GOAL_REWARD', 'STREAK_REWARD', 'ACHIEVEMENT_REWARD', 'COURSE_REWARD', 'PURCHASE', 'REFUND', 'ADMIN_ADJUSTMENT', 'REVERSAL');
CREATE TYPE "RewardEventType" AS ENUM ('EXERCISE_CORRECT', 'LESSON_COMPLETED', 'HOMEWORK_COMPLETED', 'VOCABULARY_REVIEW', 'VOCABULARY_SESSION_COMPLETED', 'WARM_UP_COMPLETED', 'DAILY_GOAL', 'COURSE_COMPLETED');
CREATE TYPE "StreakEventType" AS ENUM ('STARTED', 'CONTINUED', 'RESET', 'FREEZE_USED', 'RESTORED');
CREATE TYPE "AchievementCategory" AS ENUM ('LEARNING', 'LESSONS', 'COURSES', 'VOCABULARY', 'STREAK', 'ACCURACY', 'TIME', 'EXPERIENCE', 'SPECIAL');
CREATE TYPE "AchievementRarity" AS ENUM ('COMMON', 'RARE', 'EPIC', 'LEGENDARY');
CREATE TYPE "AchievementConditionType" AS ENUM ('LESSONS_COMPLETED', 'COURSES_COMPLETED', 'EXERCISES_CORRECT', 'VOCABULARY_REVIEWS', 'STREAK_DAYS', 'ACTIVE_MINUTES', 'EXPERIENCE_EARNED', 'PERFECT_LESSONS');
CREATE TYPE "SuspiciousActivityType" AS ENUM ('HEARTBEAT_FUTURE_TIMESTAMP', 'HEARTBEAT_REPLAY', 'HEARTBEAT_EXCESSIVE_GAP', 'CONCURRENT_SESSIONS', 'EXCESSIVE_DAILY_XP', 'EXCESSIVE_VOCABULARY_REVIEWS', 'REWARD_REPLAY');
CREATE TYPE "SuspiciousActivitySeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE "SuspiciousActivityStatus" AS ENUM ('OPEN', 'REVIEWED', 'DISMISSED', 'ACTION_TAKEN');

CREATE TABLE "LearningActivity" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "LearningActivityType" NOT NULL,
  "courseId" TEXT,
  "lessonId" TEXT,
  "exerciseId" TEXT,
  "vocabularySessionId" TEXT,
  "durationSeconds" INTEGER NOT NULL DEFAULT 0,
  "score" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LearningActivity_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LearningActivity_userId_occurredAt_idx" ON "LearningActivity"("userId", "occurredAt");
CREATE INDEX "LearningActivity_lessonId_occurredAt_idx" ON "LearningActivity"("lessonId", "occurredAt");
CREATE INDEX "LearningActivity_courseId_occurredAt_idx" ON "LearningActivity"("courseId", "occurredAt");
ALTER TABLE "LearningActivity" ADD CONSTRAINT "LearningActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearningActivity" ADD CONSTRAINT "LearningActivity_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LearningActivity" ADD CONSTRAINT "LearningActivity_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LearningActivity" ADD CONSTRAINT "LearningActivity_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LearningActivity" ADD CONSTRAINT "LearningActivity_vocabularySessionId_fkey" FOREIGN KEY ("vocabularySessionId") REFERENCES "VocabularyTrainingSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "LearningSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "courseId" TEXT,
  "lessonId" TEXT,
  "type" "LearningSessionType" NOT NULL,
  "status" "LearningSessionStatus" NOT NULL DEFAULT 'ACTIVE',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastHeartbeatAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastClientTimestamp" TIMESTAMP(3),
  "lastInteractionCount" INTEGER NOT NULL DEFAULT 0,
  "activeSeconds" INTEGER NOT NULL DEFAULT 0,
  "idleSeconds" INTEGER NOT NULL DEFAULT 0,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LearningSession_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LearningSession_userId_status_idx" ON "LearningSession"("userId", "status");
CREATE INDEX "LearningSession_userId_type_lessonId_status_idx" ON "LearningSession"("userId", "type", "lessonId", "status");
ALTER TABLE "LearningSession" ADD CONSTRAINT "LearningSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearningSession" ADD CONSTRAINT "LearningSession_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LearningSession" ADD CONSTRAINT "LearningSession_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "UserDailyActivity" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "activeSeconds" INTEGER NOT NULL DEFAULT 0,
  "lessonsStarted" INTEGER NOT NULL DEFAULT 0,
  "lessonsCompleted" INTEGER NOT NULL DEFAULT 0,
  "exercisesCompleted" INTEGER NOT NULL DEFAULT 0,
  "correctAnswers" INTEGER NOT NULL DEFAULT 0,
  "incorrectAnswers" INTEGER NOT NULL DEFAULT 0,
  "vocabularyReviews" INTEGER NOT NULL DEFAULT 0,
  "vocabularySessions" INTEGER NOT NULL DEFAULT 0,
  "warmUpsCompleted" INTEGER NOT NULL DEFAULT 0,
  "experienceEarned" INTEGER NOT NULL DEFAULT 0,
  "coinsEarned" INTEGER NOT NULL DEFAULT 0,
  "dailyGoalCompleted" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserDailyActivity_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "UserDailyActivity_userId_date_key" ON "UserDailyActivity"("userId", "date");
CREATE INDEX "UserDailyActivity_userId_date_idx" ON "UserDailyActivity"("userId", "date");
ALTER TABLE "UserDailyActivity" ADD CONSTRAINT "UserDailyActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ExperienceTransaction" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "type" "ExperienceTransactionType" NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExperienceTransaction_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ExperienceTransaction_idempotencyKey_key" ON "ExperienceTransaction"("idempotencyKey");
CREATE INDEX "ExperienceTransaction_userId_createdAt_idx" ON "ExperienceTransaction"("userId", "createdAt");
CREATE INDEX "ExperienceTransaction_type_createdAt_idx" ON "ExperienceTransaction"("type", "createdAt");
ALTER TABLE "ExperienceTransaction" ADD CONSTRAINT "ExperienceTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "UserLevel" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "level" INTEGER NOT NULL DEFAULT 1,
  "currentExperience" INTEGER NOT NULL DEFAULT 0,
  "lifetimeExperience" INTEGER NOT NULL DEFAULT 0,
  "experienceToNextLevel" INTEGER NOT NULL DEFAULT 100,
  "currentCorrectStreak" INTEGER NOT NULL DEFAULT 0,
  "bestCorrectStreak" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserLevel_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "UserLevel_userId_key" ON "UserLevel"("userId");
ALTER TABLE "UserLevel" ADD CONSTRAINT "UserLevel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "UserWallet" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "balance" INTEGER NOT NULL DEFAULT 0,
  "lifetimeEarned" INTEGER NOT NULL DEFAULT 0,
  "lifetimeSpent" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserWallet_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "UserWallet_userId_key" ON "UserWallet"("userId");
ALTER TABLE "UserWallet" ADD CONSTRAINT "UserWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CoinTransaction" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "walletId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "balanceBefore" INTEGER NOT NULL,
  "balanceAfter" INTEGER NOT NULL,
  "type" "CoinTransactionType" NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CoinTransaction_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CoinTransaction_idempotencyKey_key" ON "CoinTransaction"("idempotencyKey");
CREATE INDEX "CoinTransaction_userId_createdAt_idx" ON "CoinTransaction"("userId", "createdAt");
CREATE INDEX "CoinTransaction_type_createdAt_idx" ON "CoinTransaction"("type", "createdAt");
ALTER TABLE "CoinTransaction" ADD CONSTRAINT "CoinTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CoinTransaction" ADD CONSTRAINT "CoinTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "UserWallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "RewardRule" (
  "id" TEXT NOT NULL,
  "eventType" "RewardEventType" NOT NULL,
  "experienceAmount" INTEGER NOT NULL DEFAULT 0,
  "coinAmount" INTEGER NOT NULL DEFAULT 0,
  "dailyLimit" INTEGER,
  "weeklyLimit" INTEGER,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "conditions" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RewardRule_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RewardRule_eventType_key" ON "RewardRule"("eventType");

CREATE TABLE "UserStreak" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "currentStreak" INTEGER NOT NULL DEFAULT 0,
  "longestStreak" INTEGER NOT NULL DEFAULT 0,
  "lastQualifiedDate" TEXT,
  "streakStartedAt" TIMESTAMP(3),
  "freezeCount" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserStreak_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "UserStreak_userId_key" ON "UserStreak"("userId");
ALTER TABLE "UserStreak" ADD CONSTRAINT "UserStreak_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "StreakEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "StreakEventType" NOT NULL,
  "date" TEXT NOT NULL,
  "previousStreak" INTEGER NOT NULL,
  "nextStreak" INTEGER NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StreakEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "StreakEvent_userId_date_idx" ON "StreakEvent"("userId", "date");
ALTER TABLE "StreakEvent" ADD CONSTRAINT "StreakEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Achievement" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "icon" TEXT NOT NULL,
  "category" "AchievementCategory" NOT NULL,
  "rarity" "AchievementRarity" NOT NULL DEFAULT 'COMMON',
  "conditionType" "AchievementConditionType" NOT NULL,
  "conditionConfig" JSONB NOT NULL,
  "experienceReward" INTEGER NOT NULL DEFAULT 0,
  "coinReward" INTEGER NOT NULL DEFAULT 0,
  "isTrophy" BOOLEAN NOT NULL DEFAULT false,
  "isHidden" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Achievement_code_key" ON "Achievement"("code");
CREATE INDEX "Achievement_isActive_order_idx" ON "Achievement"("isActive", "order");

CREATE TABLE "UserAchievement" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "achievementId" TEXT NOT NULL,
  "progress" INTEGER NOT NULL DEFAULT 0,
  "target" INTEGER NOT NULL DEFAULT 1,
  "completed" BOOLEAN NOT NULL DEFAULT false,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "UserAchievement_userId_achievementId_key" ON "UserAchievement"("userId", "achievementId");
CREATE INDEX "UserAchievement_userId_completed_idx" ON "UserAchievement"("userId", "completed");
CREATE INDEX "UserAchievement_userId_achievementId_idx" ON "UserAchievement"("userId", "achievementId");
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "SuspiciousActivity" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "SuspiciousActivityType" NOT NULL,
  "severity" "SuspiciousActivitySeverity" NOT NULL DEFAULT 'LOW',
  "metadata" JSONB,
  "status" "SuspiciousActivityStatus" NOT NULL DEFAULT 'OPEN',
  "reviewedAt" TIMESTAMP(3),
  "reviewedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SuspiciousActivity_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SuspiciousActivity_userId_createdAt_idx" ON "SuspiciousActivity"("userId", "createdAt");
CREATE INDEX "SuspiciousActivity_status_severity_createdAt_idx" ON "SuspiciousActivity"("status", "severity", "createdAt");
ALTER TABLE "SuspiciousActivity" ADD CONSTRAINT "SuspiciousActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
