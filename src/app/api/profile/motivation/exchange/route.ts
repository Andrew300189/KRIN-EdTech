import { NextRequest, NextResponse } from "next/server";
import { consumeRateLimit } from "@/core/server/rate-limit";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import { exchangeExperienceForKrinCoin } from "@/modules/motivation/services/motivation.service";

export async function POST(request: NextRequest) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const limit = consumeRateLimit(`xp-coin-exchange:${guard.user.id}`, 10, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many exchange attempts. Try again in a minute." }, { status: 429 });

  const body = await request.json().catch(() => null) as { experience?: unknown } | null;
  if (!body || typeof body.experience !== "number") {
    return NextResponse.json({ error: "Enter the amount of XP to exchange." }, { status: 400 });
  }

  try {
    return NextResponse.json({ data: await exchangeExperienceForKrinCoin(guard.user.id, body.experience) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to exchange XP." }, { status: 400 });
  }
}
