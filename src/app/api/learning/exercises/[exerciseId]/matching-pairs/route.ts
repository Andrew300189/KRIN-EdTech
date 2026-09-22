import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import { getDynamicMatchingPairProgress, submitDynamicMatchingPair } from "@/modules/courses/services/content.service";
import { consumeRateLimit } from "@/core/server/rate-limit";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ exerciseId: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    const { exerciseId } = await params;
    return NextResponse.json({ data: await getDynamicMatchingPairProgress(guard.user.id, exerciseId) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load matching progress." }, { status: 400 });
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    const { exerciseId } = await params;
    const rateLimit = consumeRateLimit(`dynamic-matching:${guard.user.id}:${exerciseId}`, 90, 60_000);
    if (!rateLimit.allowed) return NextResponse.json({ error: "Too many matching attempts. Please wait a moment." }, { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } });
    return NextResponse.json({ data: await submitDynamicMatchingPair(guard.user.id, exerciseId, await request.json()) });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "Invalid matching attempt", issues: error.issues }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to check this match." }, { status: 400 });
  }
}
