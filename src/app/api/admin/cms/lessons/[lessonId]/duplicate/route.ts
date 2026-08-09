import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { cmsLessonTargetModuleSchema } from "@/modules/cms/schemas/content-management.schemas";
import { duplicateCmsLesson } from "@/modules/cms/services/lesson-operations.service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const parsed = cmsLessonTargetModuleSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid target module." }, { status: 400 });
  try {
    const lesson = await duplicateCmsLesson(guard.user.id, (await params).lessonId, parsed.data.targetModuleId);
    return NextResponse.json({ data: lesson }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to copy lesson." }, { status: 400 });
  }
}
