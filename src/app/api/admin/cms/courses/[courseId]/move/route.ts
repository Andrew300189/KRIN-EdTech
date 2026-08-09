import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { cmsCourseMoveSchema } from "@/modules/cms/schemas/content-management.schemas";
import { moveCmsCourse } from "@/modules/cms/services/course-operations.service";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const parsed = cmsCourseMoveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid course destination." }, { status: 400 });
  try {
    return NextResponse.json({ data: await moveCmsCourse(guard.user.id, (await params).courseId, parsed.data) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to move course." }, { status: 400 });
  }
}
