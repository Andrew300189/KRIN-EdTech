import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/core/server/role-guard";
import { prisma } from "@/core/server/prisma";
import { hasCourseEntitlement } from "@/modules/payments/services/entitlement.service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const guard = await requirePermission("student:learn", request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const courses = await prisma.course.findMany({
    where: {
      isPublished: true,
      isTemplate: false,
      accessMode: { in: ["FREE", "SUBSCRIPTION", "ONE_TIME_PURCHASE"] },
      level: { isPublished: true },
      category: { isPublished: true },
    },
    orderBy: { updatedAt: "desc" }, take: 100,
    select: { id: true, title: true, shortDescription: true, fullDescription: true, accessPlan: true, level: { select: { code: true, title: true } }, category: { select: { title: true } }, studentCourses: { where: { studentId: guard.user.id, status: "ACTIVE" }, select: { id: true } } },
  });
  const data = await Promise.all(courses.map(async (course) => ({ ...course, entitled: course.accessPlan === "FREE" || await hasCourseEntitlement(guard.user.id, course.id), inLibrary: course.studentCourses.length > 0 })));
  return NextResponse.json({ data });
}
