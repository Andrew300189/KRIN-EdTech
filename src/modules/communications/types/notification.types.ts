import type {
  NotificationCategory,
  NotificationChannel,
  NotificationPriority,
  NotificationType,
} from "@/generated/prisma-client-payments-runtime";

export type SafeNotificationPayload = Record<string, string | number | boolean | null>;
export type TemplateVariables = Record<string, string | number | boolean | Date | null | undefined>;

export type NotificationPolicy = {
  category: NotificationCategory;
  priority: NotificationPriority;
  channels: NotificationChannel[];
  mandatory: boolean;
  bypassQuietHours: boolean;
};

const security = new Set<NotificationType>(["PASSWORD_CHANGED", "PASSWORD_RESET", "EMAIL_VERIFICATION", "SECURITY_ALERT"]);
const billing = new Set<NotificationType>(["PAYMENT_SUCCEEDED", "PAYMENT_FAILED", "SUBSCRIPTION_STARTED", "SUBSCRIPTION_RENEWED", "SUBSCRIPTION_CANCELING", "SUBSCRIPTION_CANCELED", "SUBSCRIPTION_PAST_DUE", "TRIAL_ENDING", "REFUND_SUCCEEDED", "REFUND_FAILED", "COURSE_ACCESS_GRANTED", "COURSE_ACCESS_REVOKED"]);
const support = new Set<NotificationType>(["SUPPORT_TICKET_CREATED", "SUPPORT_TICKET_REPLIED", "SUPPORT_TICKET_STATUS_CHANGED", "SUPPORT_TICKET_RESOLVED", "SUPPORT_TICKET_REOPENED"]);
const vocabulary = new Set<NotificationType>(["VOCABULARY_REVIEW_DUE", "VOCABULARY_SESSION_COMPLETED", "DIFFICULT_WORDS_READY"]);
const motivation = new Set<NotificationType>(["DAILY_LEARNING_REMINDER", "DAILY_GOAL_COMPLETED", "STREAK_AT_RISK", "STREAK_UPDATED", "STREAK_LOST", "STREAK_FREEZE_USED", "ACHIEVEMENT_UNLOCKED", "LEVEL_UP", "COINS_RECEIVED", "XP_RECEIVED"]);

export function notificationPolicy(type: NotificationType): NotificationPolicy {
  if (security.has(type)) return { category: "SECURITY", priority: type === "SECURITY_ALERT" || type === "PASSWORD_CHANGED" ? "CRITICAL" : "HIGH", channels: ["IN_APP", "EMAIL"], mandatory: true, bypassQuietHours: true };
  if (billing.has(type)) return { category: "BILLING", priority: type === "PAYMENT_FAILED" || type === "REFUND_FAILED" ? "HIGH" : "NORMAL", channels: ["IN_APP", "EMAIL"], mandatory: true, bypassQuietHours: true };
  if (support.has(type)) return { category: "SUPPORT", priority: "NORMAL", channels: ["IN_APP", "EMAIL"], mandatory: false, bypassQuietHours: false };
  if (vocabulary.has(type)) return { category: "VOCABULARY", priority: "NORMAL", channels: ["IN_APP", "EMAIL"], mandatory: false, bypassQuietHours: false };
  if (motivation.has(type)) return { category: "MOTIVATION", priority: type === "STREAK_AT_RISK" ? "HIGH" : "LOW", channels: ["IN_APP", "EMAIL", "WEB_PUSH"], mandatory: false, bypassQuietHours: false };
  if (type === "SYSTEM_ANNOUNCEMENT" || type === "ADMIN_MESSAGE") return { category: "SYSTEM", priority: "NORMAL", channels: ["IN_APP", "EMAIL"], mandatory: false, bypassQuietHours: false };
  if (type === "WELCOME" || type === "PROFILE_UPDATED") return { category: "ACCOUNT", priority: "NORMAL", channels: ["IN_APP", "EMAIL"], mandatory: false, bypassQuietHours: false };
  return { category: "LEARNING", priority: "NORMAL", channels: ["IN_APP"], mandatory: false, bypassQuietHours: false };
}

export function categorySettingKey(category: NotificationCategory) {
  const map: Record<NotificationCategory, "learningEnabled" | "vocabularyEnabled" | "motivationEnabled" | "billingEnabled" | "supportEnabled" | "marketingEnabled" | "systemEnabled" | null> = {
    ACCOUNT: "systemEnabled", SECURITY: "systemEnabled", LEARNING: "learningEnabled", VOCABULARY: "vocabularyEnabled", MOTIVATION: "motivationEnabled", BILLING: "billingEnabled", SUPPORT: "supportEnabled", MARKETING: "marketingEnabled", SYSTEM: "systemEnabled",
  };
  return map[category];
}

export function isValidActionUrl(value: string | undefined) {
  return !value || (value.startsWith("/") && !value.startsWith("//"));
}
