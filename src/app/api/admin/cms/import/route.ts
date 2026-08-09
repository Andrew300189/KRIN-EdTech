import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { cmsCourseImportDocumentSchema } from "@/modules/cms/schemas/content-management.schemas";
import { importCmsCourse } from "@/modules/cms/services/content-transfer.service";

export async function POST(request: NextRequest) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const parsed = cmsCourseImportDocumentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "The course import document is invalid or unsupported." }, { status: 400 });
  try {
    return NextResponse.json({ data: await importCmsCourse(guard.user.id, parsed.data) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to import the course." }, { status: 400 });
  }
}
