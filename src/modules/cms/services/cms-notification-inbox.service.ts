import "server-only";

import { prisma } from "@/core/server/prisma";
import {
  CMS_NOTIFICATION_CATEGORY_META,
  type CmsNotificationCategory,
  type CmsNotificationDetail,
  type CmsNotificationItem,
  type CmsNotificationSummary,
} from "@/modules/cms/types/cms-notification-inbox.types";

const PAID_PAYMENT_STATUSES = ["PAID", "SUCCEEDED"] as const;

function roleLabel(role: string) {
  return role === "TEACHER" ? "Teacher" : role === "STUDENT" ? "Student" : role.replace(/_/g, " ");
}

function formatMoney(amountInMinorUnits: number, currency: string) {
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency }).format(amountInMinorUnits / 100);
  } catch {
    return `${(amountInMinorUnits / 100).toFixed(2)} ${currency}`;
  }
}

async function getReadState(ownerId: string) {
  const existing = await prisma.cmsNotificationReadState.findUnique({ where: { ownerId } });
  if (existing) return existing;

  // New inboxes start from the current point in time. Historic platform data
  // stays available on detail pages without presenting a misleading alert.
  const now = new Date();
  return prisma.cmsNotificationReadState.upsert({
    where: { ownerId },
    create: { ownerId, lastSeenAt: now },
    update: {},
  });
}

function asSummary(
  category: CmsNotificationCategory,
  unreadCount: number,
  latestAt: Date | null | undefined,
) {
  return {
    category,
    ...CMS_NOTIFICATION_CATEGORY_META[category],
    unreadCount,
    latestAt: latestAt?.toISOString() ?? null,
  };
}

export async function getCmsNotificationSummary(ownerId: string): Promise<CmsNotificationSummary> {
  const state = await getReadState(ownerId);
  const since = state.lastSeenAt;
  const generatedAt = new Date();

  const [
    registrationsUnread,
    registrationsLatest,
    paymentsUnread,
    paymentsLatest,
    deletionsUnread,
    deletionsLatest,
    supportUnread,
    supportLatest,
    failedPaymentsUnread,
    failedPaymentsLatest,
    securityUnread,
    securityLatest,
  ] = await Promise.all([
    prisma.user.count({ where: { id: { not: ownerId }, createdAt: { gt: since } } }),
    prisma.user.findFirst({ where: { id: { not: ownerId } }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    prisma.coursePurchase.count({
      where: {
        status: "ACTIVE",
        createdAt: { gt: since },
        payment: { is: { status: { in: [...PAID_PAYMENT_STATUSES] } } },
      },
    }),
    prisma.coursePurchase.findFirst({
      where: { status: "ACTIVE", payment: { is: { status: { in: [...PAID_PAYMENT_STATUSES] } } } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    prisma.user.count({ where: { deletedAt: { gt: since } } }),
    prisma.user.findFirst({ where: { deletedAt: { not: null } }, orderBy: { deletedAt: "desc" }, select: { deletedAt: true } }),
    prisma.supportTicket.count({ where: { createdAt: { gt: since } } }),
    prisma.supportTicket.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    prisma.payment.count({ where: { status: "FAILED", failedAt: { gt: since } } }),
    prisma.payment.findFirst({ where: { status: "FAILED" }, orderBy: { failedAt: "desc" }, select: { failedAt: true } }),
    prisma.suspiciousActivity.count({ where: { status: "OPEN", createdAt: { gt: since } } }),
    prisma.suspiciousActivity.findFirst({ where: { status: "OPEN" }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
  ]);

  const otherUnread = failedPaymentsUnread + securityUnread;
  const otherLatest = [failedPaymentsLatest?.failedAt, securityLatest?.createdAt]
    .filter((value): value is Date => value instanceof Date)
    .sort((left, right) => right.getTime() - left.getTime())[0] ?? null;

  const categories = [
    asSummary("registrations", registrationsUnread, registrationsLatest?.createdAt),
    asSummary("payments", paymentsUnread, paymentsLatest?.createdAt),
    asSummary("account-deletions", deletionsUnread, deletionsLatest?.deletedAt),
    asSummary("support", supportUnread, supportLatest?.createdAt),
    asSummary("other", otherUnread, otherLatest),
  ];

  return {
    generatedAt: generatedAt.toISOString(),
    lastSeenAt: state.lastSeenAt.toISOString(),
    unreadTotal: categories.reduce((total, category) => total + category.unreadCount, 0),
    categories,
  };
}

/** Marks only events observed by the caller as seen, preserving newer events. */
export async function markCmsNotificationsAsSeen(ownerId: string, seenThrough: Date) {
  const now = new Date();
  const safeSeenThrough = seenThrough > now ? now : seenThrough;
  const current = await getReadState(ownerId);
  if (safeSeenThrough <= current.lastSeenAt) return current;

  return prisma.cmsNotificationReadState.update({
    where: { ownerId },
    data: { lastSeenAt: safeSeenThrough },
  });
}

export async function getCmsNotificationDetail(
  category: CmsNotificationCategory,
  limit = 100,
): Promise<CmsNotificationDetail> {
  const meta = CMS_NOTIFICATION_CATEGORY_META[category];
  const take = Math.min(Math.max(limit, 1), 200);

  if (category === "registrations") {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take,
      select: { id: true, name: true, email: true, role: true, isBlocked: true, deletedAt: true, createdAt: true },
    });
    return {
      category,
      ...meta,
      items: users.map((user): CmsNotificationItem => ({
        id: `registration:${user.id}`,
        title: `${user.name || user.email} registered`,
        detail: `${user.email} · ${roleLabel(user.role)}`,
        occurredAt: user.createdAt.toISOString(),
        status: user.deletedAt ? "Archived" : user.isBlocked ? "Blocked" : "Active",
        href: "/cms/users",
      })),
    };
  }

  if (category === "payments") {
    const purchases = await prisma.coursePurchase.findMany({
      where: { status: "ACTIVE", payment: { is: { status: { in: [...PAID_PAYMENT_STATUSES] } } } },
      orderBy: { createdAt: "desc" },
      take,
      include: {
        course: { select: { id: true, title: true } },
        user: { select: { name: true, email: true } },
        payment: { select: { amount: true, currency: true, provider: true, paidAt: true } },
        order: { select: { number: true } },
      },
    });
    return {
      category,
      ...meta,
      items: purchases.map((purchase): CmsNotificationItem => ({
        id: `course-purchase:${purchase.id}`,
        title: `${purchase.user.name || purchase.user.email} bought ${purchase.course.title}`,
        detail: `${purchase.payment ? formatMoney(purchase.payment.amount, purchase.payment.currency) : "Confirmed payment"} · ${purchase.payment?.provider ?? "Payment"}${purchase.order ? ` · ${purchase.order.number}` : ""}`,
        occurredAt: (purchase.payment?.paidAt ?? purchase.createdAt).toISOString(),
        status: "Access granted",
        href: `/cms/courses/${purchase.course.id}`,
      })),
    };
  }

  if (category === "account-deletions") {
    const users = await prisma.user.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: "desc" },
      take,
      select: { id: true, name: true, email: true, deletedAt: true },
    });
    return {
      category,
      ...meta,
      items: users.map((user): CmsNotificationItem => ({
        id: `account-deletion:${user.id}`,
        title: `${user.name || user.email} was archived`,
        detail: `${user.email} · Access and active sessions were revoked.`,
        occurredAt: user.deletedAt!.toISOString(),
        status: "Archived",
        href: "/cms/users",
      })),
    };
  }

  if (category === "support") {
    const tickets = await prisma.supportTicket.findMany({
      orderBy: { createdAt: "desc" },
      take,
      include: { user: { select: { name: true, email: true } } },
    });
    return {
      category,
      ...meta,
      items: tickets.map((ticket): CmsNotificationItem => ({
        id: `support:${ticket.id}`,
        title: `${ticket.number} · ${ticket.subject}`,
        detail: `${ticket.user.name || ticket.user.email} · ${ticket.user.email}`,
        occurredAt: ticket.createdAt.toISOString(),
        status: `${ticket.priority.toLowerCase()} priority · ${ticket.status.toLowerCase().replace(/_/g, " ")}`,
        href: `/admin/support/tickets/${ticket.id}`,
      })),
    };
  }

  const [failedPayments, securityEvents] = await Promise.all([
    prisma.payment.findMany({
      where: { status: "FAILED" },
      orderBy: { failedAt: "desc" },
      take,
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.suspiciousActivity.findMany({
      where: { status: "OPEN" },
      orderBy: { createdAt: "desc" },
      take,
      include: { user: { select: { name: true, email: true } } },
    }),
  ]);
  const items: CmsNotificationItem[] = [
    ...failedPayments.map((payment): CmsNotificationItem => ({
      id: `failed-payment:${payment.id}`,
      title: `Payment needs attention: ${payment.description}`,
      detail: `${payment.user.name || payment.user.email} · ${payment.failureCode ?? "Payment failed"}`,
      occurredAt: (payment.failedAt ?? payment.updatedAt).toISOString(),
      status: "Failed payment",
      href: "/cms/sales",
    })),
    ...securityEvents.map((event): CmsNotificationItem => ({
      id: `security:${event.id}`,
      title: `Security alert: ${event.type.replace(/_/g, " ").toLowerCase()}`,
      detail: `${event.user.name || event.user.email} · ${event.user.email}`,
      occurredAt: event.createdAt.toISOString(),
      status: `${event.severity.toLowerCase()} severity`,
    })),
  ]
    .sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime())
    .slice(0, take);

  return { category, ...meta, items };
}
