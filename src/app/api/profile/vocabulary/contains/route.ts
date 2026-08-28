import { NextRequest, NextResponse } from "next/server";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import { hasUserVocabularyTerm } from "@/modules/vocabulary/services/vocabulary.service";

export async function GET(request: NextRequest) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const term = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!term || term.length > 160) return NextResponse.json({ error: "Enter a word or phrase up to 160 characters." }, { status: 400 });
  return NextResponse.json({ data: { contains: await hasUserVocabularyTerm(guard.user.id, term) } });
}
