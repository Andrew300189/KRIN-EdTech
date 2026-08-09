import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { duplicateCmsCourse } from "@/modules/cms/services/course-operations.service";

const targetLevelSchema = z.object({ targetLevelCode: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]).optional() });

export async function POST(request: NextRequest, { params }: { params: Promise<{ entityType: string; entityId: string }> }) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { entityType, entityId } = await params;
  if (entityType !== "COURSE") return NextResponse.json({ error: "Only courses can be copied between levels." }, { status: 400 });
  const parsed = targetLevelSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid target level." }, { status: 400 });
  try {
    return NextResponse.json({ data: await duplicateCmsCourse(guard.user.id, entityId, { targetLevelCode: parsed.data.targetLevelCode }) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to duplicate the course." }, { status: 400 });
  }
}
