import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { cmsCurriculumNodeSchema, curriculumNodeTypeSchema } from "@/modules/cms/schemas/content-management.schemas";
import { createCurriculumNode, listCurriculumNodes } from "@/modules/cms/services/curriculum.service";

export async function GET(request: NextRequest) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const parsedType = request.nextUrl.searchParams.get("type");
  const type = parsedType ? curriculumNodeTypeSchema.safeParse(parsedType) : null;
  if (type && !type.success) return NextResponse.json({ error: "Invalid curriculum node type." }, { status: 400 });
  return NextResponse.json({ data: await listCurriculumNodes({ levelCode: request.nextUrl.searchParams.get("level") ?? undefined, type: type?.success ? type.data : undefined, parentId: request.nextUrl.searchParams.get("parentId") ?? undefined }) });
}

export async function POST(request: NextRequest) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const parsed = cmsCurriculumNodeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid curriculum item." }, { status: 400 });
  try {
    return NextResponse.json({ data: await createCurriculumNode(guard.user.id, parsed.data) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create curriculum item." }, { status: 400 });
  }
}
