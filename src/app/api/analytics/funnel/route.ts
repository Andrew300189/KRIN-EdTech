import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { consumeRateLimit } from "@/core/server/rate-limit";
import { getValidatedSession } from "@/core/server/session";
import { funnelDeviceTypes, funnelEventResults, funnelEventTypes, funnelLevelCodes } from "@/modules/analytics/funnel-events";
import { recordFunnelEvent } from "@/modules/analytics/services/funnel.service";

export const runtime = "nodejs";

const eventSchema = z.object({
  eventId: z.string().uuid(),
  eventType: z.enum(funnelEventTypes),
  pagePath: z.string().trim().regex(/^\/(?!\/)/).max(512),
  sessionId: z.string().uuid().optional(),
  referrerPath: z.string().trim().regex(/^\/(?!\/)/).max(512).optional(),
  courseId: z.string().cuid().optional(),
  levelCode: z.enum(funnelLevelCodes).optional(),
  planCode: z.string().trim().regex(/^[A-Za-z0-9_-]+$/).max(64).optional(),
  currency: z.string().regex(/^[A-Z]{3}$/).optional(),
  deviceType: z.enum(funnelDeviceTypes).optional(),
  result: z.enum(funnelEventResults).optional(),
}).strict();

export async function POST(request: NextRequest) {
  const visitor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
  if (!consumeRateLimit(`funnel:${visitor}`, 60, 60_000).allowed) return new NextResponse(null, { status: 204 });

  try {
    const event = eventSchema.parse(await request.json());
    const session = await getValidatedSession({ headers: request.headers });
    await recordFunnelEvent({ ...event, userId: session?.userId });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof z.ZodError) return new NextResponse(null, { status: 400 });
    // Analytics must never make a product page unavailable.
    return new NextResponse(null, { status: 204 });
  }
}
