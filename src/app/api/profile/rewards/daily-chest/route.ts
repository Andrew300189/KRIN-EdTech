import { NextRequest, NextResponse } from "next/server";
import { consumeRateLimit } from "@/core/server/rate-limit";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import { getDailyChestState, openDailyChest } from "@/modules/motivation/services/reward-economy.service";

export async function GET(request: NextRequest) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  return NextResponse.json({ data: await getDailyChestState(guard.user.id) });
}

export async function POST(request: NextRequest) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const limit = consumeRateLimit(`daily-chest:${guard.user.id}`, 8, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many attempts. Please wait a moment." }, { status: 429 });
  try {
    return NextResponse.json({ data: await openDailyChest(guard.user.id) });
  } catch {
    // Do not reveal database details or reward selection internals.
    return NextResponse.json({ error: "The Daily Chest is unavailable right now." }, { status: 400 });
  }
}
