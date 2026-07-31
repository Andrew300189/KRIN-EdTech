import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import { addCustomWordToUserDictionary, addWordToUserDictionary, getUserVocabulary } from "@/modules/vocabulary/services/vocabulary.service";

export async function GET(request: NextRequest) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const query = Object.fromEntries(request.nextUrl.searchParams.entries());
  return NextResponse.json({ data: await getUserVocabulary(guard.user.id, query) });
}

export async function POST(request: NextRequest) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    const body = await request.json() as { wordId?: string; customWord?: string; customTranslation?: string };
    const word = body.wordId
      ? await addWordToUserDictionary(guard.user.id, body)
      : await addCustomWordToUserDictionary(guard.user.id, {
        term: body.customWord ?? (body as { term?: string }).term,
        translation: body.customTranslation ?? (body as { translation?: string }).translation,
        ...(body as object),
      });
    return NextResponse.json({ data: word }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "Invalid vocabulary item", issues: error.issues }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to add word" }, { status: 400 });
  }
}
