import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { cmsCurriculumNodeDuplicateSchema } from "@/modules/cms/schemas/content-management.schemas";
import { duplicateCurriculumNode } from "@/modules/cms/services/curriculum.service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ nodeId: string }> }) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const parsed = cmsCurriculumNodeDuplicateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid target level and parent." }, { status: 400 });
  try {
    return NextResponse.json({ data: await duplicateCurriculumNode(guard.user.id, (await params).nodeId, parsed.data) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to copy curriculum item." }, { status: 400 });
  }
}
