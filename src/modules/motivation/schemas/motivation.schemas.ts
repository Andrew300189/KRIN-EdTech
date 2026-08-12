import { z } from "zod";

export const createLearningSessionSchema = z.object({
  type: z.enum(["LESSON", "VOCABULARY", "HOMEWORK", "WARM_UP", "PRACTICE"]),
  lessonId: z.string().cuid().optional(),
});

export const heartbeatSchema = z.object({
  clientTimestamp: z.string().datetime(),
  interactionCount: z.number().int().min(0).max(1_000_000),
});

export const motivationSettingsSchema = z.object({
  dailyGoalMinutes: z.union([z.literal(5), z.literal(10), z.literal(15), z.literal(20), z.literal(30), z.literal(45), z.literal(60)]),
  timeZone: z.string().trim().min(1).max(100),
  showInLeaderboard: z.boolean().optional(),
});

export const rewardRuleSchema = z.object({
  experienceAmount: z.number().int().min(0).max(10_000),
  coinAmount: z.number().int().min(0).max(10_000),
  dailyLimit: z.number().int().min(1).max(10_000).nullable().optional(),
  weeklyLimit: z.number().int().min(1).max(100_000).nullable().optional(),
  isActive: z.boolean(),
  conditions: z.record(z.unknown()).optional(),
});

export const adminRewardAdjustmentSchema = z.object({
  userId: z.string().cuid(),
  experienceAmount: z.number().int().min(-10_000).max(10_000).default(0),
  coinAmount: z.number().int().min(-10_000).max(10_000).default(0),
  reason: z.string().trim().min(3).max(500),
});

export const achievementSchema = z.object({
  code: z.string().trim().min(3).max(80).regex(/^[A-Z0-9_]+$/),
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().min(2).max(500),
  icon: z.string().trim().min(1).max(32),
  category: z.enum(["LEARNING", "LESSONS", "COURSES", "VOCABULARY", "STREAK", "ACCURACY", "TIME", "EXPERIENCE", "SPECIAL"]),
  rarity: z.enum(["COMMON", "RARE", "EPIC", "LEGENDARY"]),
  conditionType: z.enum(["LESSONS_COMPLETED", "COURSES_COMPLETED", "EXERCISES_CORRECT", "VOCABULARY_REVIEWS", "STREAK_DAYS", "ACTIVE_MINUTES", "EXPERIENCE_EARNED", "PERFECT_LESSONS"]),
  target: z.number().int().min(1).max(1_000_000),
  experienceReward: z.number().int().min(0).max(100_000).default(0),
  coinReward: z.number().int().min(0).max(100_000).default(0),
  isTrophy: z.boolean().default(false),
  isHidden: z.boolean().default(false),
  isActive: z.boolean().default(true),
  order: z.number().int().min(0).max(10_000).default(0),
});
