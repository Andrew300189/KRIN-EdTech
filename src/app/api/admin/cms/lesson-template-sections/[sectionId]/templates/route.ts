import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { cmsLessonTemplateSectionItemSchema } from "@/modules/cms/schemas/content-management.schemas";
import {
  addLessonTemplateToSection,
  removeLessonTemplateFromSection,
} from "@/modules/cms/services/lesson-template-section.service";

export const runtime = "nodejs";

async function readTemplateKey(request: NextRequest) {
  return cmsLessonTemplateSectionItemSchema.safeParse(
    await request.json().catch(() => null),
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sectionId: string }> },
) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const parsed = await readTemplateKey(request);
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid lesson template." }, { status: 400 });

  try {
    const result = await addLessonTemplateToSection(
      guard.user.id,
      (await params).sectionId,
      parsed.data.templateKey,
    );
    return NextResponse.json({ data: result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to add the lesson template." },
      { status: 404 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sectionId: string }> },
) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const parsed = await readTemplateKey(request);
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid lesson template." }, { status: 400 });

  const removed = await removeLessonTemplateFromSection(
    guard.user.id,
    (await params).sectionId,
    parsed.data.templateKey,
  );
  return removed
    ? new NextResponse(null, { status: 204 })
    : NextResponse.json({ error: "Template is not in this section." }, { status: 404 });
}
