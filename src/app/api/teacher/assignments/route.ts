import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/core/server/role-guard";
import { createAssignment } from "@/modules/teaching/services/teaching.service";

export const runtime = "nodejs";
const TYPES = new Set(["LESSON", "EXERCISE_SET", "WRITTEN", "FILE_UPLOAD", "VOCABULARY", "CUSTOM"]);

export async function POST(request: NextRequest) {
  const guard = await requirePermission("teacher:assignments", request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.title !== "string" || typeof body.type !== "string" || !TYPES.has(body.type)) return NextResponse.json({ error: "Title and a valid assignment type are required." }, { status: 400 });
  try {
    const assignment = await createAssignment(guard.user.id, { title: body.title, description: typeof body.description === "string" ? body.description : undefined, type: body.type as "LESSON" | "EXERCISE_SET" | "WRITTEN" | "FILE_UPLOAD" | "VOCABULARY" | "CUSTOM", groupId: typeof body.groupId === "string" ? body.groupId : undefined, studentId: typeof body.studentId === "string" ? body.studentId : undefined, courseId: typeof body.courseId === "string" ? body.courseId : undefined, lessonId: typeof body.lessonId === "string" ? body.lessonId : undefined, maxScore: typeof body.maxScore === "number" ? body.maxScore : undefined, attemptsAllowed: typeof body.attemptsAllowed === "number" ? body.attemptsAllowed : undefined, publish: body.publish === true });
    return NextResponse.json({ data: assignment }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create assignment." }, { status: 400 });
  }
}
