import { NextRequest, NextResponse } from "next/server";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import { listStreakQuestBooks } from "@/modules/motivation/services/streak-quest-book.service";

/** Lists only the signed-in learner's server-created quest books. */
export async function GET(request: NextRequest) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  return NextResponse.json({ data: await listStreakQuestBooks(guard.user.id) });
}
