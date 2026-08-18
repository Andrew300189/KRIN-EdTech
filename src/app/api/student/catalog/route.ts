import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/core/server/role-guard";
import { listStudentCatalogCourses } from "@/modules/courses/services/student-catalog.service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const guard = await requirePermission("student:learn", request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const data = await listStudentCatalogCourses(guard.user.id);
  return NextResponse.json({ data });
}
