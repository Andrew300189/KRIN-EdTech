import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { createCmsExerciseVersion } from "@/modules/cms/services/exercise-operations.service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ exerciseId: string }> }) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    const exercise = await createCmsExerciseVersion(guard.user.id, (await params).exerciseId);
    return NextResponse.json({ data: exercise }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create a new version." }, { status: 400 });
  }
}
