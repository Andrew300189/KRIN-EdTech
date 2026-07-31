import { NextRequest, NextResponse } from "next/server";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import { dismissVocabularyReviewPrompt, getVocabularyReviewPrompt } from "@/modules/vocabulary/services/vocabulary.service";

export async function GET(request: NextRequest) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  return NextResponse.json({ data: await getVocabularyReviewPrompt(guard.user.id) });
}

export async function PATCH(request: NextRequest) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const body = await request.json().catch(() => ({})) as { hours?: number };
  return NextResponse.json({ data: await dismissVocabularyReviewPrompt(guard.user.id, Math.min(168, Math.max(1, body.hours ?? 8))) });
}
