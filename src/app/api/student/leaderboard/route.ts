import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/core/server/role-guard";
import { getDashboardLeaderboard } from "@/modules/motivation/services/motivation.service";

export const runtime = "nodejs";

/** The complete board is fetched only after a signed-in learner opens it. */
export async function GET(request: NextRequest) {
  const guard = await requirePermission("student:learn", request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const leaderboard = await getDashboardLeaderboard(guard.user.id, Number.MAX_SAFE_INTEGER);
  return NextResponse.json(
    { data: leaderboard },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
