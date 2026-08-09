import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { updateExerciseSchema } from "@/modules/courses/schemas/content.schemas";
import { updateCmsExercise } from "@/modules/cms/services/exercise-operations.service";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ exerciseId: string }> }) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    const exercise = await updateCmsExercise(guard.user.id, (await params).exerciseId, updateExerciseSchema.parse(await request.json()));
    return NextResponse.json({ data: exercise });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "Invalid exercise data.", issues: error.issues }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update exercise." }, { status: 400 });
  }
}
