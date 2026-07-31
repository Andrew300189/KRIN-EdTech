import { NextRequest, NextResponse } from "next/server";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import { listUserAchievements } from "@/modules/motivation/services/motivation.service";

export async function GET(request: NextRequest) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  return NextResponse.json({ data: await listUserAchievements(guard.user.id, request.nextUrl.searchParams.get("filter") ?? "ALL") });
}
