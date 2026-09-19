import { NextRequest, NextResponse } from "next/server";

import { consumeRateLimit } from "@/core/server/rate-limit";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import { getCurrentLeaderboardPosition } from "@/modules/motivation/services/motivation.service";

/** Private rank snapshot used after a server-confirmed reward notification. */
export async function GET(request: NextRequest) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const limit = consumeRateLimit(`leaderboard-position:${guard.user.id}`, 16, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Leaderboard is refreshing. Try again shortly." },
      { status: 429 },
    );
  }

  const data = await getCurrentLeaderboardPosition(guard.user.id);
  return NextResponse.json(
    { data },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
