import { NextRequest, NextResponse } from "next/server";
import { consumeRateLimit } from "@/core/server/rate-limit";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import { purchaseStreakFreeze } from "@/modules/motivation/services/motivation.service";

export async function POST(request: NextRequest) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const limit = consumeRateLimit(`streak-freeze:${guard.user.id}`, 5, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many freeze purchases. Try again in a minute." }, { status: 429 });

  try {
    return NextResponse.json({ data: await purchaseStreakFreeze(guard.user.id) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to buy a Streak Freeze." }, { status: 400 });
  }
}
