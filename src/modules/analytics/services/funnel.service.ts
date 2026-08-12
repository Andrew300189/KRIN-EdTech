import { Prisma } from "@/generated/prisma-client-payments-runtime";
import { prisma } from "@/core/server/prisma";
import type { FunnelDeviceType, FunnelEventResult, FunnelEventType, FunnelLevelCode } from "@/modules/analytics/funnel-events";

type FunnelEventInput = {
  eventId: string;
  eventType: FunnelEventType;
  pagePath: string;
  sessionId?: string | null;
  referrerPath?: string | null;
  courseId?: string | null;
  levelCode?: FunnelLevelCode | null;
  planCode?: string | null;
  currency?: string | null;
  deviceType?: FunnelDeviceType | null;
  result?: FunnelEventResult | null;
  userId?: string | null;
};

function isUniqueEventError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

/**
 * Stores a constrained, first-party funnel event. The caller deliberately
 * cannot attach e-mail, payment data, URLs with query strings or free-form
 * metadata to this record.
 */
export async function recordFunnelEvent(input: FunnelEventInput) {
  try {
    await prisma.funnelEvent.create({
      data: {
        eventId: input.eventId,
        eventType: input.eventType,
        pagePath: input.pagePath,
        sessionId: input.sessionId ?? null,
        referrerPath: input.referrerPath ?? null,
        courseId: input.courseId ?? null,
        levelCode: input.levelCode ?? null,
        planCode: input.planCode ?? null,
        currency: input.currency ?? null,
        deviceType: input.deviceType ?? null,
        result: input.result ?? null,
        userId: input.userId ?? null,
      },
    });
    return { recorded: true };
  } catch (error) {
    if (isUniqueEventError(error)) return { recorded: false, duplicate: true };
    throw error;
  }
}

export async function getFunnelAnalyticsSummary(days = 30) {
  const periodDays = Math.min(365, Math.max(1, Math.floor(days)));
  const since = new Date(Date.now() - (periodDays - 1) * 86_400_000);
  const grouped = await prisma.funnelEvent.groupBy({
    by: ["eventType"],
    where: { createdAt: { gte: since } },
    _count: { _all: true },
    orderBy: { eventType: "asc" },
  });

  const counts = Object.fromEntries(grouped.map((row) => [row.eventType, row._count._all]));
  const count = (eventType: FunnelEventType) => Number(counts[eventType] ?? 0);
  const rate = (completed: FunnelEventType, started: FunnelEventType) => {
    const denominator = count(started);
    return denominator ? Math.round((count(completed) / denominator) * 1000) / 10 : null;
  };

  return {
    periodDays,
    counts,
    conversion: {
      placementCompletionRate: rate("PLACEMENT_TEST_COMPLETE", "PLACEMENT_TEST_START"),
      previewCompletionRate: rate("PREVIEW_LESSON_COMPLETE", "PREVIEW_LESSON_START"),
      signupCompletionRate: rate("SIGNUP_COMPLETE", "SIGNUP_START"),
      purchaseCompletionRate: rate("PURCHASE_COMPLETE", "CHECKOUT_START"),
      firstLessonCompletionRate: rate("FIRST_LESSON_COMPLETE", "FIRST_LESSON_START"),
    },
  };
}
