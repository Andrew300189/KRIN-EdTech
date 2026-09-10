import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { createGrammarExerciseDraftSet } from "@/modules/cms/services/grammar-course-authoring.service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ blockId: string }> }) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    const data = await createGrammarExerciseDraftSet(guard.user.id, (await params).blockId);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create grammar exercise drafts." }, { status: 400 });
  }
}
