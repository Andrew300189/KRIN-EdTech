import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { cmsLessonReorderSchema } from "@/modules/cms/schemas/content-management.schemas";
import { reorderCmsLessons } from "@/modules/cms/services/lesson-operations.service";

export async function PATCH(request: NextRequest) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const parsed = cmsLessonReorderSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid lesson order." }, { status: 400 });
  try {
    await reorderCmsLessons(guard.user.id, parsed.data.moduleId, parsed.data.lessonIds);
    return NextResponse.json({ data: { lessonIds: parsed.data.lessonIds } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to reorder lessons." }, { status: 400 });
  }
}
