import { NextRequest, NextResponse } from "next/server";
import { requireLearningUser } from "@/modules/courses/server/content-access";

/** Water Lilies now restore the answer streak inside a lesson only. */
export async function POST(request: NextRequest) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  return NextResponse.json({ error: "Restore answer streaks inside the lesson." }, { status: 410 });
}
