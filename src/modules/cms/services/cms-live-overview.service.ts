import "server-only";

import { prisma } from "@/core/server/prisma";
import type { CmsLiveActivity, CmsLiveOverview } from "@/modules/cms/types/cms-live-overview.types";

function displayAccountName(user: { name: string; email: string }): string {
  return user.name.trim() || user.email;
}

function humanizeEventType(type: string): string {
  return type
    .toLowerCase()
    .split("_")
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

/**
 * Owner-only operational overview. High-volume account and learning activity
 * stays aggregated in metrics; the live stream intentionally contains only
 * security alerts, failed payments and urgent support work.
 */
export async function getCmsLiveOverview(): Promise<CmsLiveOverview> {
  const now = Date.now();
  const last24Hours = new Date(now - 24 * 60 * 60_000);
  const last7Days = new Date(now - 7 * 24 * 60 * 60_000);

  const [
    accounts,
    students,
    teachers,
    registrationsLast24Hours,
    registrationsLast7Days,
    activeEnrollments,
    confirmedPayments,
    failedPayments,
    courses,
    publishedCourses,
    drafts,
    scheduled,
    openTickets,
    media,
    slots,
    securityAlerts,
    paymentFailures,
    urgentTickets,
  ] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { role: "STUDENT", deletedAt: null, isBlocked: false } }),
    prisma.user.count({ where: { role: "TEACHER", deletedAt: null, isBlocked: false } }),
    prisma.user.count({
      where: { role: "STUDENT", deletedAt: null, isBlocked: false, createdAt: { gte: last24Hours } },
    }),
    prisma.user.count({
      where: { role: "STUDENT", deletedAt: null, isBlocked: false, createdAt: { gte: last7Days } },
    }),
    prisma.studentCourse.count({
      where: { status: "ACTIVE", student: { deletedAt: null, isBlocked: false } },
    }),
    prisma.payment.count({ where: { status: { in: ["PAID", "SUCCEEDED"] } } }),
    prisma.payment.count({ where: { status: "FAILED" } }),
    prisma.course.count(),
    prisma.course.count({ where: { contentStatus: "PUBLISHED" } }),
    prisma.course.count({ where: { contentStatus: "DRAFT" } }),
    prisma.course.count({ where: { contentStatus: "SCHEDULED" } }),
    prisma.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.cmsMediaAsset.count({ where: { isArchived: false } }),
    prisma.cmsContentSlot.count({ where: { contentStatus: { not: "ARCHIVED" } } }),
    prisma.suspiciousActivity.findMany({
      where: { status: "OPEN", severity: "HIGH" },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        type: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
      },
    }),
    prisma.payment.findMany({
      where: { status: "FAILED" },
      orderBy: [{ failedAt: "desc" }, { updatedAt: "desc" }],
      take: 12,
      select: {
        id: true,
        provider: true,
        failureCode: true,
        failedAt: true,
        updatedAt: true,
        user: { select: { name: true, email: true } },
      },
    }),
    prisma.supportTicket.findMany({
      where: { priority: "URGENT", status: { in: ["OPEN", "IN_PROGRESS"] } },
      orderBy: { lastMessageAt: "desc" },
      take: 12,
      select: {
        id: true,
        number: true,
        subject: true,
        lastMessageAt: true,
        user: { select: { name: true, email: true } },
      },
    }),
  ]);

  const recentActivity: CmsLiveActivity[] = [
    ...securityAlerts.map((activity) => ({
      id: `security:${activity.id}`,
      kind: "SECURITY" as const,
      type: "SECURITY_ALERT" as const,
      severity: "CRITICAL" as const,
      title: `Security alert: ${humanizeEventType(activity.type)}`,
      detail: `${displayAccountName(activity.user)} requires review`,
      occurredAt: activity.createdAt.toISOString(),
    })),
    ...paymentFailures.map((payment) => ({
      id: `payment-failure:${payment.id}`,
      kind: "BILLING" as const,
      type: "PAYMENT_FAILURE" as const,
      severity: "HIGH" as const,
      title: "Payment failed",
      detail: `${displayAccountName(payment.user)} · ${payment.provider.toLowerCase()}${payment.failureCode ? ` · ${payment.failureCode}` : ""}`,
      occurredAt: (payment.failedAt ?? payment.updatedAt).toISOString(),
    })),
    ...urgentTickets.map((ticket) => ({
      id: `urgent-support:${ticket.id}`,
      kind: "SUPPORT" as const,
      type: "URGENT_SUPPORT" as const,
      severity: "HIGH" as const,
      title: `Urgent support ticket #${ticket.number}`,
      detail: `${ticket.subject} · ${displayAccountName(ticket.user)}`,
      occurredAt: ticket.lastMessageAt.toISOString(),
    })),
  ]
    .sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime())
    .slice(0, 12);

  return {
    generatedAt: new Date().toISOString(),
    users: { accounts, students, teachers, registrationsLast24Hours, registrationsLast7Days },
    courses: { total: courses, published: publishedCourses, drafts, scheduled },
    payments: { confirmed: confirmedPayments, failed: failedPayments },
    support: { open: openTickets },
    operations: {
      activeEnrollments,
      reusableMediaAssets: media,
      structuredPageSlots: slots,
    },
    recentActivity,
  };
}
