import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/core/server/role-guard";
import { listTeacherStudents } from "@/modules/teaching/services/teaching.service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const guard = await requirePermission("teacher:groups", request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  return NextResponse.json({ data: await listTeacherStudents(guard.user.id) });
}
