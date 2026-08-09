import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { createCmsCourseTemplate } from "@/modules/cms/services/course-operations.service";

/** Saves an editable, non-discoverable blueprint with a fresh course ID/slug. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    const template = await createCmsCourseTemplate(guard.user.id, (await params).courseId);
    return NextResponse.json({ data: template }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create course template." }, { status: 400 });
  }
}
