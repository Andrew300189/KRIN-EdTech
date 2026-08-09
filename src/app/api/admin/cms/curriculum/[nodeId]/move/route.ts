import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { cmsCurriculumNodeMoveSchema } from "@/modules/cms/schemas/content-management.schemas";
import { moveCurriculumNode } from "@/modules/cms/services/curriculum.service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ nodeId: string }> }) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const parsed = cmsCurriculumNodeMoveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid curriculum move." }, { status: 400 });
  try {
    return NextResponse.json({ data: await moveCurriculumNode(guard.user.id, (await params).nodeId, parsed.data) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to move curriculum item." }, { status: 400 });
  }
}
