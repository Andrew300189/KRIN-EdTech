import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireContentManager } from "@/modules/courses/server/content-access";
import { createVocabularyWord, listVocabularyWordsForAdmin } from "@/modules/vocabulary/services/vocabulary.service";

export async function GET(request: NextRequest) {
  const guard = await requireContentManager(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  return NextResponse.json({ data: await listVocabularyWordsForAdmin(request.nextUrl.searchParams.get("q") ?? undefined) });
}

export async function POST(request: NextRequest) {
  const guard = await requireContentManager(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    const word = await createVocabularyWord(guard.user.id, await request.json());
    return NextResponse.json({ data: word }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "Invalid vocabulary word", issues: error.issues }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create vocabulary word" }, { status: 400 });
  }
}
