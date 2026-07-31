import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import { saveHomeworkSubmission } from "@/modules/courses/services/content.service";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ blockId: string }> }) {
  const guard = await requireLearningUser(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    const submission = await saveHomeworkSubmission(guard.user.id, (await params).blockId, await request.json());
    return NextResponse.json({ data: submission });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "Invalid homework data", issues: error.issues }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save homework" }, { status: 400 });
  }
}
