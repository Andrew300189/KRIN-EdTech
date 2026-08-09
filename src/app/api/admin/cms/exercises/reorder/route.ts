import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { cmsExerciseReorderSchema } from "@/modules/cms/schemas/content-management.schemas";
import { reorderCmsExercises } from "@/modules/cms/services/exercise-operations.service";

export async function PATCH(request: NextRequest) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const parsed = cmsExerciseReorderSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid exercise order." }, { status: 400 });
  try {
    await reorderCmsExercises(guard.user.id, parsed.data.lessonBlockId, parsed.data.exerciseIds);
    return NextResponse.json({ data: { exerciseIds: parsed.data.exerciseIds } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to reorder exercises." }, { status: 400 });
  }
}
