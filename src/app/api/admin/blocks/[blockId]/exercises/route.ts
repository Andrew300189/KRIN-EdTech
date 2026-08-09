import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { createExerciseSchema } from "@/modules/courses/schemas/content.schemas";
import { createExercise } from "@/modules/courses/services/content.service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ blockId: string }> }) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    const input = createExerciseSchema.parse(await request.json());
    const exercise = await createExercise(guard.user.id, (await params).blockId, input);
    return NextResponse.json({ data: exercise }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "Invalid exercise data", issues: error.issues }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create exercise" }, { status: 400 });
  }
}
