import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { deleteCourseGrammarSkill, updateCourseGrammarSkill } from "@/modules/grammar/services/grammar-cms.service";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ courseId: string; grammarSkillId: string }> }) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { courseId, grammarSkillId } = await params;
  try {
    return NextResponse.json({ data: await updateCourseGrammarSkill(guard.user.id, courseId, grammarSkillId, await request.json()) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof ZodError ? "Invalid grammar skill." : error instanceof Error ? error.message : "Unable to update grammar skill." }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ courseId: string; grammarSkillId: string }> }) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { courseId, grammarSkillId } = await params;
  try {
    const deleted = await deleteCourseGrammarSkill(guard.user.id, courseId, grammarSkillId);
    return deleted ? NextResponse.json({ data: { deleted: true } }) : NextResponse.json({ error: "Grammar skill not found." }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to delete grammar skill." }, { status: 400 });
  }
}
