import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { cmsModuleReorderSchema } from "@/modules/cms/schemas/content-management.schemas";
import { reorderCmsCourseModules } from "@/modules/cms/services/module-operations.service";

export async function PATCH(request: NextRequest) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    const input = cmsModuleReorderSchema.parse(await request.json());
    return NextResponse.json({ data: await reorderCmsCourseModules(guard.user.id, input.courseId, input.moduleIds) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to reorder modules." }, { status: 400 });
  }
}
