import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/core/server/role-guard";
import { assignCourseToGroup } from "@/modules/teaching/services/teaching.service";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  const guard = await requirePermission("teacher:assignments", request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.courseId !== "string") return NextResponse.json({ error: "Course is required." }, { status: 400 });
  try {
    const assignment = await assignCourseToGroup(guard.user.id, (await params).groupId, body.courseId, { required: body.required !== false });
    return NextResponse.json({ data: assignment }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to assign course." }, { status: 400 });
  }
}
