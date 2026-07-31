import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { consumeRateLimit } from "@/core/server/rate-limit";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import { submitVocabularyAnswer } from "@/modules/vocabulary/services/vocabulary.service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const itemId = (await params).itemId;
  const rate = consumeRateLimit(`vocabulary-answer:${guard.user.id}:${itemId}`, 8, 60_000);
  if (!rate.allowed) return NextResponse.json({ error: "Too many answers. Please wait before trying again." }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } });
  try { return NextResponse.json({ data: await submitVocabularyAnswer(guard.user.id, itemId, await request.json()) }); }
  catch (error) { if (error instanceof ZodError) return NextResponse.json({ error: "Invalid answer", issues: error.issues }, { status: 400 }); return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to submit answer" }, { status: 400 }); }
}
