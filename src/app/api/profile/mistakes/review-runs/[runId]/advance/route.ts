import { NextRequest, NextResponse } from "next/server";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import { advanceMistakeReviewRun } from "@/modules/courses/services/mistake-review.service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const body = await request.json().catch(() => null) as { lessonId?: unknown } | null;
  if (!body || typeof body.lessonId !== "string" || !body.lessonId) return NextResponse.json({ error: "Invalid lesson." }, { status: 400 });
  const result = await advanceMistakeReviewRun(guard.user.id, (await params).runId, body.lessonId);
  return result.state === "NOT_FOUND"
    ? NextResponse.json({ error: "Review run not found." }, { status: 404 })
    : NextResponse.json({ data: result });
}
