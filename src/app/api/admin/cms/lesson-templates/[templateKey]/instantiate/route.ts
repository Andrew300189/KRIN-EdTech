import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { cmsLessonBlueprintTargetModuleSchema } from "@/modules/cms/schemas/content-management.schemas";
import { instantiateLessonTemplate } from "@/modules/cms/services/lesson-template-section.service";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ templateKey: string }> },
) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const parsed = cmsLessonBlueprintTargetModuleSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid target module." }, { status: 400 });

  try {
    const lesson = await instantiateLessonTemplate(
      guard.user.id,
      (await params).templateKey,
      parsed.data.targetModuleId,
    );
    return NextResponse.json({ data: lesson }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create the lesson draft." },
      { status: 400 },
    );
  }
}
