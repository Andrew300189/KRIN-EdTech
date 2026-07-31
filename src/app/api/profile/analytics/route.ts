import { NextRequest, NextResponse } from "next/server";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import { getUserAnalytics } from "@/modules/motivation/services/motivation.service";

export async function GET(request: NextRequest) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const requested = Number(request.nextUrl.searchParams.get("days") ?? 30);
  return NextResponse.json({ data: await getUserAnalytics(guard.user.id, Number.isFinite(requested) ? requested : 30) });
}
