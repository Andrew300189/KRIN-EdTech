import { prisma } from "@/core/server/prisma";
import { notificationService } from "@/modules/communications/services/notification.service";

function matchesAudience(audience: unknown, user: { role: string; country: string | null }) {
  if (!audience || typeof audience !== "object" || Array.isArray(audience)) return true;
  const value = audience as { roles?: unknown; countries?: unknown };
  const roles = Array.isArray(value.roles) ? value.roles.filter((item): item is string => typeof item === "string") : [];
  const countries = Array.isArray(value.countries) ? value.countries.filter((item): item is string => typeof item === "string") : [];
  return (!roles.length || roles.includes(user.role)) && (!countries.length || (user.country != null && countries.includes(user.country)));
}

export async function publishDueAnnouncements(now = new Date()) {
  await prisma.systemAnnouncement.updateMany({ where: { status: "SCHEDULED", scheduledAt: { lte: now } }, data: { status: "PUBLISHED", publishedAt: now } });
  const announcements = await prisma.systemAnnouncement.findMany({ where: { status: "PUBLISHED", OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }, take: 20 });
  const users = await prisma.user.findMany({ where: { isBlocked: false, deletedAt: null }, select: { id: true, role: true, country: true }, take: 1000 });
  let created = 0;
  for (const announcement of announcements) for (const user of users) {
    if (!matchesAudience(announcement.audience, user)) continue;
    const notification = await notificationService.createNotification({ userId: user.id, type: "SYSTEM_ANNOUNCEMENT", idempotencyKey: `announcement:${announcement.id}:${user.id}`, entityType: "SystemAnnouncement", entityId: announcement.id, title: announcement.title, message: announcement.message, actionUrl: announcement.actionUrl ?? undefined, actionLabel: announcement.actionUrl ? "Learn more" : undefined });
    if (!notification.duplicate) created += 1;
  }
  return { announcements: announcements.length, created };
}
