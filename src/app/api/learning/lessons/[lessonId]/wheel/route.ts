import { NextRequest, NextResponse } from "next/server";
import { consumeRateLimit } from "@/core/server/rate-limit";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import { getLessonXpMultiplierWheelState, spinLessonXpMultiplierWheel } from "@/modules/motivation/services/reward-economy.service";

async function guardWheelRequest(request: NextRequest, params: Promise<{ lessonId: string }>) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return guard;
  const { lessonId } = await params;
  if (!lessonId || lessonId.length > 80) return { ok: false as const, status: 400, error: "Invalid lesson." };
  return { ok: true as const, user: guard.user, lessonId };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
  const guard = await guardWheelRequest(request, params);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    return NextResponse.json({ data: await getLessonXpMultiplierWheelState(guard.user.id, guard.lessonId) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "The multiplier wheel is unavailable right now." }, { status: 400 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
  const guard = await guardWheelRequest(request, params);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const limit = consumeRateLimit(`lesson-xp-multiplier:${guard.user.id}:${guard.lessonId}`, 5, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many spins. Please wait a moment." }, { status: 429 });
  try {
    return NextResponse.json({ data: await spinLessonXpMultiplierWheel(guard.user.id, guard.lessonId) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "The multiplier wheel is unavailable right now." }, { status: 400 });
  }
}
