import { NextRequest, NextResponse } from "next/server";
import { consumeRateLimit } from "@/core/server/rate-limit";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import { restoreLostStreak } from "@/modules/motivation/services/motivation.service";

/** Uses the server-selected resource priority for one burned daily streak. */
export async function POST(request: NextRequest) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const limit = consumeRateLimit(`streak-restore:${guard.user.id}`, 5, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many restore requests. Try again in a minute." }, { status: 429 });

  try {
    return NextResponse.json({ data: await restoreLostStreak(guard.user.id) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to restore the streak." }, { status: 400 });
  }
}
