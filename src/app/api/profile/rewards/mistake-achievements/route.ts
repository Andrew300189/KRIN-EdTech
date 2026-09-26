import { NextRequest, NextResponse } from "next/server";
import { consumeRateLimit } from "@/core/server/rate-limit";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import { claimMistakeCorrectionAchievement, getMistakeCorrectionAchievementState } from "@/modules/motivation/services/mistake-correction-achievements.service";

export async function GET(request: NextRequest) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  return NextResponse.json({ data: await getMistakeCorrectionAchievementState(guard.user.id) });
}

export async function POST(request: NextRequest) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const limit = consumeRateLimit(`mistake-achievements:${guard.user.id}`, 10, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many claims. Try again in a minute." }, { status: 429 });
  const body = await request.json().catch(() => null) as { target?: unknown } | null;
  if (typeof body?.target !== "number" || !Number.isSafeInteger(body.target)) return NextResponse.json({ error: "Invalid achievement." }, { status: 400 });
  try {
    return NextResponse.json({ data: await claimMistakeCorrectionAchievement(guard.user.id, body.target) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "The achievement is unavailable." }, { status: 400 });
  }
}
