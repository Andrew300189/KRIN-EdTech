import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { lessonVocabularyLinkSchema } from "@/modules/vocabulary/schemas/vocabulary.schemas";
import { linkWordToLesson, listLessonVocabulary } from "@/modules/vocabulary/services/vocabulary.service";

export async function GET(request: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  return NextResponse.json({ data: await listLessonVocabulary((await params).lessonId) });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    const value = lessonVocabularyLinkSchema.parse(await request.json());
    const linked = await linkWordToLesson(guard.user.id, (await params).lessonId, value.wordId, value.role, value.isRequired, value.order);
    return NextResponse.json({ data: linked }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "Invalid lesson vocabulary link", issues: error.issues }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to link word" }, { status: 400 });
  }
}
