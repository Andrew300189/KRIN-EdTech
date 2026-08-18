import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { cmsLessonTemplateSectionSchema } from "@/modules/cms/schemas/content-management.schemas";
import {
  createLessonTemplateSection,
  listLessonTemplateSections,
} from "@/modules/cms/services/lesson-template-section.service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  return NextResponse.json({ data: await listLessonTemplateSections() });
}

export async function POST(request: NextRequest) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const parsed = cmsLessonTemplateSectionSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter a section name between 2 and 120 characters." },
      { status: 400 },
    );
  }

  const section = await createLessonTemplateSection(guard.user.id, parsed.data);
  return NextResponse.json({ data: section }, { status: 201 });
}
