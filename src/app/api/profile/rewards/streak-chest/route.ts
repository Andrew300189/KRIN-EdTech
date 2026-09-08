import { NextRequest, NextResponse } from "next/server";
import { consumeRateLimit } from "@/core/server/rate-limit";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import { openStreakChest } from "@/modules/motivation/services/reward-economy.service";

export async function POST(request: NextRequest) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const limit = consumeRateLimit(`streak-chest:${guard.user.id}`, 8, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many attempts. Please wait a moment." }, { status: 429 });

  const body = await request.json().catch(() => null) as { milestone?: unknown } | null;
  const milestone = typeof body?.milestone === "number" ? body.milestone : Number.NaN;
  try {
    return NextResponse.json({ data: await openStreakChest(guard.user.id, milestone) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "The streak chest is unavailable right now." },
      { status: 400 },
    );
  }
}
