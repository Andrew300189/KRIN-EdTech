import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { duplicateLessonBlock, updateLessonBlock } from "@/modules/courses/services/content.service";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ blockId: string }> }) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    return NextResponse.json({ data: await updateLessonBlock(guard.user.id, (await params).blockId, await request.json()) });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "Invalid lesson block data.", issues: error.issues }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update lesson block." }, { status: 400 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ blockId: string }> }) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    return NextResponse.json({ data: await duplicateLessonBlock(guard.user.id, (await params).blockId) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to copy lesson block." }, { status: 400 });
  }
}
