import { NextRequest, NextResponse } from "next/server";
import { consumeRateLimit } from "@/core/server/rate-limit";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import { claimWeeklyEasterEgg } from "@/modules/motivation/services/motivation.service";

export async function POST(request: NextRequest) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const limit = consumeRateLimit(`easter-egg:${guard.user.id}`, 10, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });

  try {
    return NextResponse.json({ data: await claimWeeklyEasterEgg(guard.user.id) });
  } catch {
    // Do not expose database or reward internals from a hidden interaction.
    return NextResponse.json({ error: "Unable to check this reward right now." }, { status: 400 });
  }
}
