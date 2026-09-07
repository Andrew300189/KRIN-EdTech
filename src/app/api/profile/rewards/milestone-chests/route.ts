import { NextRequest, NextResponse } from "next/server";
import { consumeRateLimit } from "@/core/server/rate-limit";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import { getMilestoneChestState, openMilestoneChest, type MilestoneChestKind } from "@/modules/motivation/services/reward-economy.service";

const chestKinds = new Set<MilestoneChestKind>(["LESSON_3", "EVERY_7_LESSONS", "MODULE", "COURSE"]);

export async function GET(request: NextRequest) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  return NextResponse.json({ data: await getMilestoneChestState(guard.user.id) });
}

export async function POST(request: NextRequest) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const limit = consumeRateLimit(`milestone-chest:${guard.user.id}`, 12, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many attempts. Please wait a moment." }, { status: 429 });

  const body = await request.json().catch(() => null) as { kind?: unknown; sourceId?: unknown } | null;
  const kind = typeof body?.kind === "string" && chestKinds.has(body.kind as MilestoneChestKind)
    ? body.kind as MilestoneChestKind
    : null;
  const sourceId = typeof body?.sourceId === "string" && /^[A-Za-z0-9_-]{1,80}$/.test(body.sourceId)
    ? body.sourceId
    : null;
  if (!kind || !sourceId) return NextResponse.json({ error: "Invalid chest request." }, { status: 400 });

  try {
    return NextResponse.json({ data: await openMilestoneChest(guard.user.id, kind, sourceId) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "The chest is unavailable right now." }, { status: 400 });
  }
}
