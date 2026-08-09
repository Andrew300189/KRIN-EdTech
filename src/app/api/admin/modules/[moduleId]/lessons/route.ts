import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { createLessonSchema } from "@/modules/courses/schemas/content.schemas";
import { createLesson } from "@/modules/courses/services/content.service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ moduleId: string }> }) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    const input = createLessonSchema.parse(await request.json());
    const lesson = await createLesson(guard.user.id, (await params).moduleId, input);
    return NextResponse.json({ data: lesson }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "Invalid lesson data", issues: error.issues }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create lesson" }, { status: 400 });
  }
}
