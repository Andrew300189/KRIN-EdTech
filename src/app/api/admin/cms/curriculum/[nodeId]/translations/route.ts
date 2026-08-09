import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { cmsCurriculumNodeTranslationSchema } from "@/modules/cms/schemas/content-management.schemas";
import { upsertCurriculumNodeTranslation } from "@/modules/cms/services/curriculum.service";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ nodeId: string }> }) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const parsed = cmsCurriculumNodeTranslationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid localized curriculum content." }, { status: 400 });
  try {
    return NextResponse.json({ data: await upsertCurriculumNodeTranslation(guard.user.id, (await params).nodeId, parsed.data) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save translation." }, { status: 400 });
  }
}
