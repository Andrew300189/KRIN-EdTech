import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import { getVocabularySettings, updateVocabularySettings } from "@/modules/vocabulary/services/vocabulary.service";

export async function GET(request: NextRequest) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  return NextResponse.json({ data: await getVocabularySettings(guard.user.id) });
}

export async function PATCH(request: NextRequest) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try { return NextResponse.json({ data: await updateVocabularySettings(guard.user.id, await request.json()) }); }
  catch (error) { if (error instanceof ZodError) return NextResponse.json({ error: "Invalid settings", issues: error.issues }, { status: 400 }); return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update settings" }, { status: 400 }); }
}
