import { NextRequest, NextResponse } from "next/server";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import { getVocabularyTrainingSession, skipVocabularyTrainingSession } from "@/modules/vocabulary/services/vocabulary.service";

export async function GET(request: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const session = await getVocabularyTrainingSession(guard.user.id, (await params).sessionId);
  return session ? NextResponse.json({ data: session }) : NextResponse.json({ error: "Training session not found" }, { status: 404 });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const result = await skipVocabularyTrainingSession(guard.user.id, (await params).sessionId);
  return result.count ? NextResponse.json({ data: { skipped: true } }) : NextResponse.json({ error: "Active training session not found" }, { status: 404 });
}
