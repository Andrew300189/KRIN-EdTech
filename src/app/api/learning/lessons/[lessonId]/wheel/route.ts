import { NextRequest, NextResponse } from "next/server";
import { consumeRateLimit } from "@/core/server/rate-limit";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import { spinLessonRewardWheel } from "@/modules/motivation/services/reward-economy.service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { lessonId } = await params;
  if (!lessonId || lessonId.length > 80) return NextResponse.json({ error: "Invalid lesson." }, { status: 400 });
  const limit = consumeRateLimit(`lesson-wheel:${guard.user.id}:${lessonId}`, 5, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many spins. Please wait a moment." }, { status: 429 });
  try {
    return NextResponse.json({ data: await spinLessonRewardWheel(guard.user.id, lessonId) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "The reward wheel is unavailable right now." }, { status: 400 });
  }
}
