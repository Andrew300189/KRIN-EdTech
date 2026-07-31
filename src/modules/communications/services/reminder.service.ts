import { prisma } from "@/core/server/prisma";
import { notificationService } from "@/modules/communications/services/notification.service";

function localDate(date: Date, timezone: string) {
  try { return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date); }
  catch { return localDate(date, "UTC"); }
}

function localTime(date: Date, timezone: string) {
  try { return new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date); }
  catch { return localTime(date, "UTC"); }
}

function dueAtReminderTime(now: Date, time: string | null, timezone: string) {
  if (!time) return false;
  const [hour, minute] = localTime(now, timezone).split(":").map(Number);
  const [targetHour, targetMinute] = time.split(":").map(Number);
  return hour === targetHour && Math.abs(minute - targetMinute) < 5;
}

export async function processLearningReminders(now = new Date()) {
  const rows = await prisma.userNotificationSettings.findMany({ where: { dailyReminderTime: { not: null }, learningEnabled: true }, include: { user: { select: { id: true, name: true, dailyGoalMinutes: true, streak: { select: { currentStreak: true } } } } }, take: 500 });
  let created = 0;
  for (const settings of rows) {
    if (!dueAtReminderTime(now, settings.dailyReminderTime, settings.timezone)) continue;
    const date = localDate(now, settings.timezone);
    const activity = await prisma.userDailyActivity.findUnique({ where: { userId_date: { userId: settings.userId, date } }, select: { activeSeconds: true, dailyGoalCompleted: true } });
    if (activity?.dailyGoalCompleted || (activity?.activeSeconds ?? 0) >= settings.user.dailyGoalMinutes * 60) continue;
    const reminder = await notificationService.createNotification({ userId: settings.userId, type: "DAILY_LEARNING_REMINDER", idempotencyKey: `daily-learning-reminder:${settings.userId}:${date}`, entityType: "UserDailyActivity", entityId: date, title: "Your learning goal is waiting", message: "A short lesson today keeps your learning streak moving.", actionUrl: "/dashboard/lessons", actionLabel: "Start learning" });
    if (!reminder.duplicate) created += 1;
    const dueWords = await prisma.userWord.count({ where: { userId: settings.userId, nextReviewAt: { lte: now }, status: { in: ["NEW", "LEARNING", "REVIEW"] } } });
    if (dueWords > 0) {
      const vocabulary = await notificationService.createNotification({ userId: settings.userId, type: "VOCABULARY_REVIEW_DUE", idempotencyKey: `vocabulary-reminder:${settings.userId}:${date}`, entityType: "Vocabulary", entityId: date, title: "Vocabulary review is ready", message: `${dueWords} word${dueWords === 1 ? " is" : "s are"} ready to review.`, actionUrl: "/dashboard/vocabulary", actionLabel: "Review words", payload: { amount: dueWords } });
      if (!vocabulary.duplicate) created += 1;
    }
    if ((settings.user.streak?.currentStreak ?? 0) > 0) {
      const streak = await notificationService.createNotification({ userId: settings.userId, type: "STREAK_AT_RISK", idempotencyKey: `streak-risk:${settings.userId}:${date}`, entityType: "UserStreak", entityId: date, title: "Keep your streak alive", message: "Complete a short activity before the day ends to protect your streak.", actionUrl: "/dashboard/lessons", actionLabel: "Continue learning" });
      if (!streak.duplicate) created += 1;
    }
  }
  return { created, evaluated: rows.length };
}
