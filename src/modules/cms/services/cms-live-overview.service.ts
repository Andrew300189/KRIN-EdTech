import "server-only";

import { prisma } from "@/core/server/prisma";
import type {
  CmsLiveActivity,
  CmsLiveOverview,
} from "@/modules/cms/types/cms-live-overview.types";

function displayAccountName(user: { name: string; email: string }): string {
  return user.name.trim() || user.email;
}

function learningActivityLabel(type: string): string {
  return type
    .toLowerCase()
    .split("_")
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

/**
 * Owner-only operations overview. It always reads canonical database rows,
 * so registration, learning and billing events become visible without a
 * separate aggregation job or duplicated counter table.
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
    registrations,
    learningActivities,
    payments,
  ] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({
      where: { role: "STUDENT", deletedAt: null, isBlocked: false },
    }),
    prisma.user.count({
      where: { role: "TEACHER", deletedAt: null, isBlocked: false },
    }),
    prisma.user.count({
      where: {
        role: "STUDENT",
        deletedAt: null,
        isBlocked: false,
        createdAt: { gte: last24Hours },
      },
    }),
    prisma.user.count({
      where: {
        role: "STUDENT",
        deletedAt: null,
        isBlocked: false,
        createdAt: { gte: last7Days },
      },
    }),
    prisma.studentCourse.count({
      where: {
        status: "ACTIVE",
        student: { deletedAt: null, isBlocked: false },
      },
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
    prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    }),
    prisma.learningActivity.findMany({
      orderBy: { occurredAt: "desc" },
      take: 5,
      select: {
        id: true,
        type: true,
        occurredAt: true,
        user: { select: { name: true, email: true } },
      },
    }),
    prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, provider: true, status: true, createdAt: true },
    }),
  ]);

  const recentActivity: CmsLiveActivity[] = [
    ...registrations.map((user) => ({
      id: `registration:${user.id}`,
      kind: "REGISTRATION" as const,
      title: "New account registered",
      detail: `${displayAccountName(user)} · ${user.role.toLowerCase()}`,
      occurredAt: user.createdAt.toISOString(),
    })),
    ...learningActivities.map((activity) => ({
      id: `learning:${activity.id}`,
      kind: "LEARNING" as const,
      title: learningActivityLabel(activity.type),
      detail: displayAccountName(activity.user),
      occurredAt: activity.occurredAt.toISOString(),
    })),
    ...payments.map((payment) => ({
      id: `payment:${payment.id}`,
      kind: "PAYMENT" as const,
      title:
        payment.status === "PAID" || payment.status === "SUCCEEDED"
          ? "Payment confirmed"
          : "Payment status updated",
      detail: `${payment.provider} · ${payment.status}`,
      occurredAt: payment.createdAt.toISOString(),
    })),
  ]
    .sort(
      (left, right) =>
        new Date(right.occurredAt).getTime() -
        new Date(left.occurredAt).getTime(),
    )
    .slice(0, 8);

  return {
    generatedAt: new Date().toISOString(),
    users: {
      accounts,
      students,
      teachers,
      registrationsLast24Hours,
      registrationsLast7Days,
    },
    courses: {
      total: courses,
      published: publishedCourses,
      drafts,
      scheduled,
    },
    payments: {
      confirmed: confirmedPayments,
      failed: failedPayments,
    },
    support: { open: openTickets },
    operations: {
      activeEnrollments,
      reusableMediaAssets: media,
      structuredPageSlots: slots,
    },
    recentActivity,
  };
}
