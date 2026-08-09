import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { exportCmsCourse } from "@/modules/cms/services/content-transfer.service";

export async function GET(request: NextRequest, { params }: { params: Promise<{ entityType: string; entityId: string }> }) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { entityType, entityId } = await params;
  if (entityType !== "COURSE") return NextResponse.json({ error: "Export is currently available for courses." }, { status: 400 });
  const document = await exportCmsCourse(entityId);
  if (!document) return NextResponse.json({ error: "Course not found." }, { status: 404 });
  const filename = `${document.course.slug || "course"}-cms-export.json`;
  return new NextResponse(JSON.stringify(document, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
