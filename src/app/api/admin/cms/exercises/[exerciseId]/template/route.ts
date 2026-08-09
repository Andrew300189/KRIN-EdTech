import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { cmsExerciseTemplateSchema } from "@/modules/cms/schemas/content-management.schemas";
import { saveCmsExerciseTemplate } from "@/modules/cms/services/exercise-operations.service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ exerciseId: string }> }) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const parsed = cmsExerciseTemplateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid template details." }, { status: 400 });
  try {
    const template = await saveCmsExerciseTemplate(guard.user.id, (await params).exerciseId, parsed.data);
    return NextResponse.json({ data: template }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save exercise template." }, { status: 400 });
  }
}
