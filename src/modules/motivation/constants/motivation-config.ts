export const MOTIVATION_CONFIG = {
  heartbeat: {
    minimumIntervalSeconds: 10,
    maximumIntervalSeconds: 120,
    maximumCreditedSeconds: 60,
    maximumSessionSeconds: 4 * 60 * 60,
    maximumDailySeconds: 4 * 60 * 60,
    futureToleranceSeconds: 30,
  },
  dailyGoals: [5, 10, 15, 20, 30, 45, 60],
  defaultTimeZone: "UTC",
} as const;

export const DEFAULT_REWARD_RULES = [
  { eventType: "EXERCISE_CORRECT", experienceAmount: 2, coinAmount: 0, dailyLimit: 50, weeklyLimit: null },
  { eventType: "LESSON_COMPLETED", experienceAmount: 50, coinAmount: 5, dailyLimit: 1, weeklyLimit: null },
  { eventType: "HOMEWORK_COMPLETED", experienceAmount: 30, coinAmount: 3, dailyLimit: 3, weeklyLimit: null },
  { eventType: "VOCABULARY_REVIEW", experienceAmount: 1, coinAmount: 0, dailyLimit: 60, weeklyLimit: null },
  { eventType: "VOCABULARY_SESSION_COMPLETED", experienceAmount: 20, coinAmount: 2, dailyLimit: 3, weeklyLimit: null },
  { eventType: "WARM_UP_COMPLETED", experienceAmount: 10, coinAmount: 1, dailyLimit: 3, weeklyLimit: null },
  { eventType: "DAILY_GOAL", experienceAmount: 25, coinAmount: 5, dailyLimit: 1, weeklyLimit: null },
  { eventType: "COURSE_COMPLETED", experienceAmount: 300, coinAmount: 25, dailyLimit: null, weeklyLimit: null },
] as const;
