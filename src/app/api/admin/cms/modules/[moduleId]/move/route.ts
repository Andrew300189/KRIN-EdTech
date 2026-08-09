import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { cmsModuleMoveSchema } from "@/modules/cms/schemas/content-management.schemas";
import { moveCmsCourseModule } from "@/modules/cms/services/module-operations.service";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ moduleId: string }> }) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    const input = cmsModuleMoveSchema.parse(await request.json());
    return NextResponse.json({ data: await moveCmsCourseModule(guard.user.id, (await params).moduleId, input.targetCourseId) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to move module." }, { status: 400 });
  }
}
