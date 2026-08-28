import { NextRequest, NextResponse } from "next/server";
import { consumeRateLimit } from "@/core/server/rate-limit";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import { markVocabularyTrainingItemMastered } from "@/modules/vocabulary/services/vocabulary.service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const itemId = (await params).itemId;
  const rate = consumeRateLimit(`vocabulary-mastered:${guard.user.id}:${itemId}`, 4, 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before trying again." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }
  try {
    return NextResponse.json({ data: await markVocabularyTrainingItemMastered(guard.user.id, itemId) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to mark the word as learned" }, { status: 400 });
  }
}
