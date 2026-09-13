import { NextRequest, NextResponse } from "next/server";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import { activateUserQuest, listUserAchievements } from "@/modules/motivation/services/motivation.service";

export async function GET(request: NextRequest) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  return NextResponse.json({ data: await listUserAchievements(guard.user.id, request.nextUrl.searchParams.get("filter") ?? "ALL") });
}

export async function POST(request: NextRequest) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    const body = await request.json() as { achievementId?: unknown };
    if (typeof body.achievementId !== "string" || !/^c[a-z0-9]{20,}$/i.test(body.achievementId)) {
      return NextResponse.json({ error: "Invalid quest." }, { status: 400 });
    }
    return NextResponse.json({ data: await activateUserQuest(guard.user.id, body.achievementId) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to activate this quest." }, { status: 400 });
  }
}
