import { Prisma } from "@/generated/prisma-client-payments-runtime";
import { prisma } from "@/core/server/prisma";
import { emailService } from "@/modules/communications/services/email.service";
import { renderNotificationTemplate } from "@/modules/communications/services/template-renderer";
import { categorySettingKey, isValidActionUrl, notificationPolicy, type SafeNotificationPayload, type TemplateVariables } from "@/modules/communications/types/notification.types";
import type { NotificationBadgeSection } from "@/modules/communications/types/navigation-badges";
import type { NotificationCategory, NotificationChannel, NotificationDeliveryStatus, NotificationType } from "@/generated/prisma-client-payments-runtime";

type Tx = Prisma.TransactionClient;
type Settings = { locale: string; timezone: string; inAppEnabled: boolean; emailEnabled: boolean; webPushEnabled: boolean; learningEnabled: boolean; vocabularyEnabled: boolean; motivationEnabled: boolean; billingEnabled: boolean; supportEnabled: boolean; marketingEnabled: boolean; systemEnabled: boolean; quietHoursEnabled: boolean; quietHoursStart: string | null; quietHoursEnd: string | null };

const navigationBadgeCategories: Record<NotificationBadgeSection, NotificationCategory[]> = {
  courses: ["LEARNING"],
  vocabulary: ["VOCABULARY"],
  achievements: ["MOTIVATION"],
  billing: ["BILLING"],
  support: ["SUPPORT"],
  settings: ["ACCOUNT", "SECURITY", "SYSTEM", "MARKETING"],
};

export type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  idempotencyKey: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  payload?: SafeNotificationPayload;
  variables?: TemplateVariables;
  actionUrl?: string;
  actionLabel?: string;
  imageUrl?: string;
  expiresAt?: Date;
  scheduledAt?: Date;
  channels?: NotificationChannel[];
};

function categoryAllowed(settings: Settings, category: NotificationCategory) {
  const key = categorySettingKey(category);
  return !key || settings[key];
}

function localMinutes(date: Date, timezone: string) {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
    const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
    const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
    return hour * 60 + minute;
  } catch { return localMinutes(date, "UTC"); }
}

function toMinutes(value: string | null) {
  if (!value || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

export function isQuietHours(date: Date, settings: Pick<Settings, "timezone" | "quietHoursEnabled" | "quietHoursStart" | "quietHoursEnd">) {
  const start = toMinutes(settings.quietHoursStart);
  const end = toMinutes(settings.quietHoursEnd);
  if (!settings.quietHoursEnabled || start == null || end == null || start === end) return false;
  const minute = localMinutes(date, settings.timezone);
  return start < end ? minute >= start && minute < end : minute >= start || minute < end;
}

function endOfQuietHours(date: Date, settings: Pick<Settings, "timezone" | "quietHoursStart" | "quietHoursEnd">) {
  const end = toMinutes(settings.quietHoursEnd);
  if (end == null) return date;
  const current = localMinutes(date, settings.timezone);
  const delay = ((end - current + 1440) % 1440) || 1440;
  return new Date(date.getTime() + delay * 60_000);
}

function safePayload(payload: SafeNotificationPayload | undefined) {
  return payload ? JSON.parse(JSON.stringify(payload)) as Prisma.InputJsonValue : undefined;
}

async function userSettings(tx: Tx, userId: string) {
  const user = await tx.user.findUnique({ where: { id: userId }, select: { interfaceLanguage: true, timeZone: true } });
  if (!user) throw new Error("Notification recipient was not found.");
  return tx.userNotificationSettings.upsert({ where: { userId }, update: {}, create: { userId, locale: user.interfaceLanguage || "en", timezone: user.timeZone || "UTC" } });
}

async function permittedChannels(tx: Tx, input: CreateNotificationInput, settings: Settings) {
  const policy = notificationPolicy(input.type);
  const requested = input.channels ?? policy.channels;
  const preferences = await tx.userNotificationPreference.findMany({ where: { userId: input.userId, notificationType: input.type } });
  const byChannel = new Map(preferences.map((item) => [item.channel, item.enabled]));
  const now = new Date();
  return requested.flatMap((channel) => {
    const enabled = channel === "IN_APP" ? settings.inAppEnabled : channel === "EMAIL" ? settings.emailEnabled : settings.webPushEnabled;
    if (!policy.mandatory && (!enabled || !categoryAllowed(settings, policy.category) || byChannel.get(channel) === false)) return [];
    const delayed = channel !== "IN_APP" && !policy.bypassQuietHours && isQuietHours(now, settings);
    return [{ channel, scheduledAt: delayed ? endOfQuietHours(now, settings) : (input.scheduledAt ?? now) }];
  });
}

function retryAt(attemptCount: number) {
  return new Date(Date.now() + Math.min(24 * 60, 2 ** attemptCount) * 60_000);
}

export class NotificationService {
  async createNotification(input: CreateNotificationInput) {
    if (!isValidActionUrl(input.actionUrl)) throw new Error("Notification action URL must be an internal path.");
    const created = await prisma.$transaction(async (tx) => {
      const existing = await tx.notificationEvent.findUnique({ where: { idempotencyKey: input.idempotencyKey }, include: { notification: true } });
      if (existing) return { duplicate: true as const, notification: existing.notification, eventId: existing.id };
      const event = await tx.notificationEvent.create({ data: { userId: input.userId, type: input.type, entityType: input.entityType, entityId: input.entityId, payload: safePayload(input.payload), idempotencyKey: input.idempotencyKey, status: "PROCESSING" } });
      const settings = await userSettings(tx, input.userId);
      const policy = notificationPolicy(input.type);
      const notification = await tx.notification.create({ data: { eventId: event.id, userId: input.userId, type: input.type, category: policy.category, priority: policy.priority, title: input.title.slice(0, 180), message: input.message.slice(0, 2_000), actionUrl: input.actionUrl, actionLabel: input.actionLabel?.slice(0, 80), imageUrl: input.imageUrl, payload: safePayload(input.payload), expiresAt: input.expiresAt } });
      const channels = await permittedChannels(tx, input, settings);
      for (const { channel, scheduledAt } of channels) {
        await tx.notificationDelivery.create({ data: { notificationId: notification.id, userId: input.userId, channel, provider: channel === "IN_APP" ? "database" : null, status: channel === "IN_APP" ? "DELIVERED" : "QUEUED", scheduledAt, sentAt: channel === "IN_APP" ? new Date() : null, deliveredAt: channel === "IN_APP" ? new Date() : null, idempotencyKey: `${event.id}:${channel}` } });
      }
      await tx.notificationEvent.update({ where: { id: event.id }, data: { status: "PROCESSED", processedAt: new Date() } });
      return { duplicate: false as const, notification, eventId: event.id };
    });
    return created;
  }

  async processNotificationEvent(input: CreateNotificationInput) {
    return this.createNotification(input);
  }

  async scheduleNotification(input: CreateNotificationInput & { scheduledAt: Date }) {
    return this.createNotification(input);
  }

  async sendEphemeralEmail(input: CreateNotificationInput & { email: { to: string; subject: string; text: string; html?: string | null; category?: "default" | "support" | "billing" | "security" } }) {
    const created = await this.createNotification({ ...input, channels: ["IN_APP"] });
    if (created.duplicate || !created.notification) return created;
    const key = `${created.eventId}:EMAIL:ephemeral`;
    const delivery = await prisma.notificationDelivery.create({ data: { notificationId: created.notification.id, userId: input.userId, channel: "EMAIL", status: "PROCESSING", attemptCount: 1, provider: process.env.EMAIL_PROVIDER || "log", scheduledAt: new Date(), idempotencyKey: key } });
    try {
      const sent = await emailService.sendEmail(input.email);
      await prisma.notificationDelivery.update({ where: { id: delivery.id }, data: { status: "SENT", provider: sent.provider, providerMessageId: sent.providerMessageId, sentAt: new Date() } });
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 500) : "Email delivery failed.";
      await prisma.notificationDelivery.update({ where: { id: delivery.id }, data: { status: "FAILED", failedAt: new Date(), failureCode: "DELIVERY_FAILED", failureMessage: message } });
    }
    return created;
  }

  async getUserNotifications(userId: string, input: { cursor?: string; category?: NotificationCategory; limit?: number } = {}) {
    const limit = Math.min(Math.max(input.limit ?? 20, 1), 50);
    const where: Prisma.NotificationWhereInput = { userId, ...(input.category ? { category: input.category } : {}), status: { in: ["ACTIVE", "READ"] } };
    const rows = await prisma.notification.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: limit + 1, ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}) });
    const hasNext = rows.length > limit;
    const notifications = hasNext ? rows.slice(0, limit) : rows;
    await prisma.notification.updateMany({ where: { id: { in: notifications.filter((item) => !item.seenAt).map((item) => item.id) }, userId }, data: { seenAt: new Date() } });
    return { notifications, nextCursor: hasNext ? notifications[notifications.length - 1]?.id ?? null : null };
  }

  async getUnreadCount(userId: string) {
    return prisma.notification.count({ where: { userId, status: "ACTIVE", readAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } });
  }

  async getNavigationBadgeCounts(userId: string): Promise<Record<NotificationBadgeSection, number>> {
    const grouped = await prisma.notification.groupBy({
      by: ["category"],
      where: { userId, status: "ACTIVE", readAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      _count: { _all: true },
    });
    const byCategory = new Map(grouped.map((item) => [item.category, item._count._all]));
    return Object.fromEntries(Object.entries(navigationBadgeCategories).map(([section, categories]) => [
      section,
      categories.reduce((count, category) => count + (byCategory.get(category) ?? 0), 0),
    ])) as Record<NotificationBadgeSection, number>;
  }

  async markNavigationSectionAsRead(userId: string, section: NotificationBadgeSection) {
    return prisma.notification.updateMany({
      where: { userId, category: { in: navigationBadgeCategories[section] }, status: "ACTIVE", readAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      data: { status: "READ", readAt: new Date(), seenAt: new Date() },
    });
  }

  async markAsRead(userId: string, notificationId: string) {
    const result = await prisma.notification.updateMany({ where: { id: notificationId, userId, status: "ACTIVE" }, data: { status: "READ", readAt: new Date(), seenAt: new Date() } });
    return result.count === 1;
  }

  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({ where: { userId, status: "ACTIVE", readAt: null }, data: { status: "READ", readAt: new Date(), seenAt: new Date() } });
  }

  async archiveNotification(userId: string, notificationId: string) {
    return prisma.notification.updateMany({ where: { id: notificationId, userId, status: { in: ["ACTIVE", "READ"] } }, data: { status: "ARCHIVED" } });
  }

  async cancelScheduledNotification(userId: string, notificationId: string) {
    return prisma.notificationDelivery.updateMany({ where: { notificationId, userId, status: "QUEUED" }, data: { status: "CANCELED" } });
  }

  async processDeliveryQueue(batchSize = Number(process.env.NOTIFICATION_BATCH_SIZE || 25)) {
    if (process.env.NOTIFICATION_WORKER_ENABLED === "false") return { processed: 0, skipped: true };
    const queue = await prisma.notificationDelivery.findMany({ where: { status: "QUEUED", scheduledAt: { lte: new Date() } }, orderBy: { scheduledAt: "asc" }, take: Math.min(Math.max(batchSize, 1), 100), include: { notification: true, user: { select: { email: true, name: true, interfaceLanguage: true } } } });
    let processed = 0;
    for (const delivery of queue) {
      const claim = await prisma.notificationDelivery.updateMany({ where: { id: delivery.id, status: "QUEUED" }, data: { status: "PROCESSING", attemptCount: { increment: 1 } } });
      if (!claim.count) continue;
      processed += 1;
      try {
        if (delivery.channel === "EMAIL") {
          const payload = typeof delivery.notification.payload === "object" && delivery.notification.payload ? delivery.notification.payload as Record<string, string | number | boolean | null> : {};
          const rendered = await renderNotificationTemplate({ code: `${delivery.notification.type}_EMAIL`, channel: "EMAIL", locale: delivery.user.interfaceLanguage || "en", variables: { ...payload, userName: delivery.user.name, actionUrl: delivery.notification.actionUrl }, fallback: { title: delivery.notification.title, body: delivery.notification.message, actionLabel: delivery.notification.actionLabel, actionUrl: delivery.notification.actionUrl } });
          const category = delivery.notification.category === "BILLING" ? "billing" : delivery.notification.category === "SECURITY" ? "security" : delivery.notification.category === "SUPPORT" ? "support" : "default";
          const sent = await emailService.sendEmail({ to: delivery.user.email, subject: rendered.subject ?? rendered.title, text: rendered.body, html: rendered.htmlBody, category });
          await prisma.notificationDelivery.update({ where: { id: delivery.id }, data: { provider: sent.provider, providerMessageId: sent.providerMessageId, status: "SENT", sentAt: new Date() } });
        } else if (delivery.channel === "WEB_PUSH") {
          await prisma.notificationDelivery.update({ where: { id: delivery.id }, data: { provider: "web-push", status: "SKIPPED", failureCode: "PUSH_NOT_CONFIGURED", failureMessage: "Web Push is prepared but not configured." } });
        } else {
          await prisma.notificationDelivery.update({ where: { id: delivery.id }, data: { status: "DELIVERED", deliveredAt: new Date() } });
        }
      } catch (error) {
        const attemptCount = delivery.attemptCount + 1;
        const max = Math.min(Math.max(Number(process.env.NOTIFICATION_MAX_RETRIES || 4), 1), 10);
        const message = error instanceof Error ? error.message.slice(0, 500) : "Notification delivery failed.";
        await prisma.notificationDelivery.update({ where: { id: delivery.id }, data: attemptCount >= max ? { status: "FAILED", failedAt: new Date(), failureCode: "DELIVERY_FAILED", failureMessage: message } : { status: "QUEUED", scheduledAt: retryAt(attemptCount), failureCode: "RETRY_SCHEDULED", failureMessage: message } });
      }
    }
    return { processed, skipped: false };
  }

  async applyCommunicationRetentionPolicy() {
    const threshold = new Date(Date.now() - 365 * 24 * 60 * 60 * 1_000);
    return prisma.notification.updateMany({ where: { status: { in: ["ACTIVE", "READ"] }, createdAt: { lt: threshold }, priority: { not: "CRITICAL" } }, data: { status: "ARCHIVED" } });
  }
}

export const notificationService = new NotificationService();
