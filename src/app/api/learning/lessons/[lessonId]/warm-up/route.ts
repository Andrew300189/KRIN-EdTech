import { NextRequest, NextResponse } from "next/server";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import { createLessonWarmUp } from "@/modules/vocabulary/services/vocabulary.service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try { return NextResponse.json({ data: await createLessonWarmUp(guard.user.id, (await params).lessonId) }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create warm-up" }, { status: 400 }); }
}
