import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { cmsCourseBulkUpdateSchema } from "@/modules/cms/schemas/content-management.schemas";
import { bulkUpdateCmsCourses } from "@/modules/cms/services/course-operations.service";

export async function PATCH(request: NextRequest) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const parsed = cmsCourseBulkUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid bulk course update." }, { status: 400 });
  const result = await bulkUpdateCmsCourses(guard.user.id, parsed.data);
  return NextResponse.json({ data: result }, { status: result.failed ? 207 : 200 });
}
