import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/core/server/role-guard";
import { reviewSubmission } from "@/modules/teaching/services/teaching.service";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ submissionId: string }> }) {
  const guard = await requirePermission("teacher:reviews", request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const body = await request.json().catch(() => null);
  try {
    const submission = await reviewSubmission(guard.user.id, (await params).submissionId, { score: typeof body?.score === "number" ? body.score : undefined, feedback: typeof body?.feedback === "string" ? body.feedback : undefined, needsRevision: body?.needsRevision === true });
    return NextResponse.json({ data: submission });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to review submission." }, { status: 400 });
  }
}
