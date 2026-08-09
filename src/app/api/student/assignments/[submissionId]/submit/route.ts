import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/core/server/role-guard";
import { submitAssignment } from "@/modules/teaching/services/teaching.service";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: Promise<{ submissionId: string }> }) {
  const guard = await requirePermission("student:learn", request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const body = await request.json().catch(() => null);
  if (!body || !("content" in body)) return NextResponse.json({ error: "Assignment content is required." }, { status: 400 });
  try {
    const submission = await submitAssignment(guard.user.id, (await params).submissionId, body.content);
    return NextResponse.json({ data: submission });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to submit assignment." }, { status: 400 });
  }
}
