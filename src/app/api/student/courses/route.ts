import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/core/server/role-guard";
import { addCourseToStudentLibrary } from "@/modules/teaching/services/teaching.service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const guard = await requirePermission("student:learn", request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.courseId !== "string") return NextResponse.json({ error: "Course is required." }, { status: 400 });
  try {
    const course = await addCourseToStudentLibrary(guard.user.id, body.courseId);
    return NextResponse.json({ data: course }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to add course." }, { status: 400 });
  }
}
