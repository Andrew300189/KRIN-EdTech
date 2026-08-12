import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/core/server/prisma";
import { consumeRateLimit } from "@/core/server/rate-limit";
import { getValidatedSession } from "@/core/server/session";

export const runtime = "nodejs";

const metricSchema = z.object({
  id: z.string().trim().min(1).max(160),
  name: z.enum(["CLS", "FCP", "FID", "INP", "LCP", "TTFB"]),
  value: z.number().finite().min(0).max(10_000_000),
  delta: z.number().finite().min(-10_000_000).max(10_000_000).optional(),
  rating: z.enum(["good", "needs-improvement", "poor"]),
  navigationType: z.string().trim().min(1).max(48).optional(),
  pagePath: z.string().trim().regex(/^\/(?!\/)/).max(512),
});

export async function POST(request: NextRequest) {
  const visitor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
  const limit = consumeRateLimit(`web-vitals:${visitor}`, 30, 60_000);
  if (!limit.allowed) return new NextResponse(null, { status: 204 });

  try {
    const metric = metricSchema.parse(await request.json());
    const session = await getValidatedSession({ headers: request.headers });
    await prisma.webVitalMetric.upsert({
      where: { metricId: metric.id },
      create: {
        metricId: metric.id,
        name: metric.name,
        value: metric.value,
        delta: metric.delta,
        rating: metric.rating,
        navigationType: metric.navigationType,
        pagePath: metric.pagePath,
        userId: session?.userId,
      },
      update: {
        value: metric.value,
        delta: metric.delta,
        rating: metric.rating,
        navigationType: metric.navigationType,
        pagePath: metric.pagePath,
      },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof z.ZodError) return new NextResponse(null, { status: 400 });
    // Performance collection must never make a page unusable when telemetry is unavailable.
    return new NextResponse(null, { status: 204 });
  }
}
