import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { unlinkWordFromLesson } from "@/modules/vocabulary/services/vocabulary.service";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ lessonId: string; wordId: string }> }) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { lessonId, wordId } = await params;
  const deleted = await unlinkWordFromLesson(guard.user.id, lessonId, wordId);
  return deleted ? new NextResponse(null, { status: 204 }) : NextResponse.json({ error: "Lesson vocabulary link not found" }, { status: 404 });
}
