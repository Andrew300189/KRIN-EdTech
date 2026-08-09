import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { cmsModuleTargetCourseSchema } from "@/modules/cms/schemas/content-management.schemas";
import { duplicateCmsCourseModule } from "@/modules/cms/services/module-operations.service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ moduleId: string }> }) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    const input = cmsModuleTargetCourseSchema.parse(await request.json().catch(() => ({})));
    return NextResponse.json({ data: await duplicateCmsCourseModule(guard.user.id, (await params).moduleId, input.targetCourseId) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to copy module." }, { status: 400 });
  }
}
