import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/core/server/role-guard";
import { removeCourseFromStudentLibrary } from "@/modules/teaching/services/teaching.service";

export const runtime = "nodejs";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  const guard = await requirePermission("student:learn", request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    return NextResponse.json({ data: await removeCourseFromStudentLibrary(guard.user.id, (await params).courseId) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to remove course." }, { status: 400 });
  }
}
