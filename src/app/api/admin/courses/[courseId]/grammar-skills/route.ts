import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { createCourseGrammarSkill, listCourseGrammarSkills } from "@/modules/grammar/services/grammar-cms.service";

export async function GET(request: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  return NextResponse.json({ data: await listCourseGrammarSkills((await params).courseId) });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    const skill = await createCourseGrammarSkill(guard.user.id, (await params).courseId, await request.json());
    return NextResponse.json({ data: skill }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof ZodError ? "Invalid grammar skill." : error instanceof Error ? error.message : "Unable to create grammar skill." }, { status: 400 });
  }
}
