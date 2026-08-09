import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { CmsCourseDeletionBlockedError, deleteCmsCoursePermanently, getCmsCourseDeletionImpact } from "@/modules/cms/services/course-operations.service";

export async function GET(request: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    return NextResponse.json({ data: await getCmsCourseDeletionImpact((await params).courseId) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to inspect course deletion impact." }, { status: 404 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    return NextResponse.json({ data: await deleteCmsCoursePermanently(guard.user.id, (await params).courseId) });
  } catch (error) {
    if (error instanceof CmsCourseDeletionBlockedError) {
      return NextResponse.json({ error: "This course must be archived instead of deleted.", impact: error.impact }, { status: 409 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to delete course." }, { status: 400 });
  }
}
