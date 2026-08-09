import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { cmsExerciseTargetLessonSchema } from "@/modules/cms/schemas/content-management.schemas";
import { createCmsExerciseFromTemplate } from "@/modules/cms/services/exercise-operations.service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ templateId: string }> }) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const parsed = cmsExerciseTargetLessonSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a target lesson." }, { status: 400 });
  try {
    const exercise = await createCmsExerciseFromTemplate(guard.user.id, (await params).templateId, parsed.data.targetLessonId);
    return NextResponse.json({ data: exercise }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create exercise from template." }, { status: 400 });
  }
}
