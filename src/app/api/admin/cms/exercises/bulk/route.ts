import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { cmsExerciseBulkUpdateSchema } from "@/modules/cms/schemas/content-management.schemas";
import { bulkUpdateCmsExercises } from "@/modules/cms/services/exercise-operations.service";

export async function PATCH(request: NextRequest) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const parsed = cmsExerciseBulkUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid exercise bulk update." }, { status: 400 });
  try {
    await bulkUpdateCmsExercises(guard.user.id, parsed.data.exerciseIds, { basePoints: parsed.data.basePoints, hintsEnabled: parsed.data.hintsEnabled });
    return NextResponse.json({ data: { updated: parsed.data.exerciseIds.length } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update exercises." }, { status: 400 });
  }
}
