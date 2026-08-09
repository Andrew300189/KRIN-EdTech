import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { cmsCurriculumNodeUpdateSchema } from "@/modules/cms/schemas/content-management.schemas";
import { updateCurriculumNode } from "@/modules/cms/services/curriculum.service";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ nodeId: string }> }) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const parsed = cmsCurriculumNodeUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid curriculum update." }, { status: 400 });
  try {
    return NextResponse.json({ data: await updateCurriculumNode(guard.user.id, (await params).nodeId, parsed.data) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update curriculum item." }, { status: 400 });
  }
}
