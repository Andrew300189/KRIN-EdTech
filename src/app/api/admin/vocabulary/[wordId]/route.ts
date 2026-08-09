import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { getVocabularyWordForAdmin, updateVocabularyWord } from "@/modules/vocabulary/services/vocabulary.service";

export async function GET(request: NextRequest, { params }: { params: Promise<{ wordId: string }> }) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const word = await getVocabularyWordForAdmin((await params).wordId);
  return word ? NextResponse.json({ data: word }) : NextResponse.json({ error: "Word not found" }, { status: 404 });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ wordId: string }> }) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    const word = await updateVocabularyWord(guard.user.id, (await params).wordId, await request.json());
    return NextResponse.json({ data: word });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "Invalid vocabulary update", issues: error.issues }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update word" }, { status: 400 });
  }
}
