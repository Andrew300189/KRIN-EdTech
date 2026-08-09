import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/core/server/prisma";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { cmsCourseCurriculumLinksSchema } from "@/modules/cms/schemas/content-management.schemas";
import { replaceCourseCurriculumLinks } from "@/modules/cms/services/curriculum.service";

export async function GET(request: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const course = await prisma.course.findUnique({ where: { id: (await params).courseId }, select: { id: true, level: { select: { code: true } }, curriculumLinks: { include: { node: { select: { id: true, type: true, title: true, slug: true } } } } } });
  if (!course) return NextResponse.json({ error: "Course not found." }, { status: 404 });
  return NextResponse.json({ data: course });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const parsed = cmsCourseCurriculumLinksSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid course curriculum links." }, { status: 400 });
  try {
    return NextResponse.json({ data: await replaceCourseCurriculumLinks(guard.user.id, (await params).courseId, parsed.data) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save course curriculum links." }, { status: 400 });
  }
}
