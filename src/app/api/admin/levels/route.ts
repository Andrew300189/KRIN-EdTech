import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma-client-payments-runtime";
import { prisma } from "@/core/server/prisma";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { cmsLanguageLevelSchema } from "@/modules/cms/schemas/content-management.schemas";
import { recordCmsContentVersion } from "@/modules/cms/services/content-workflow.service";
import { writeContentAudit } from "@/modules/courses/services/content.service";

const standardOrder = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 } as const;

function nullable(value: string | undefined) {
  return value?.trim() || null;
}

export async function GET(request: NextRequest) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const levels = await prisma.languageLevel.findMany({
    orderBy: { order: "asc" },
    include: {
      _count: { select: { courses: true, curriculumNodes: true } },
      courses: { select: { id: true, contentStatus: true, modules: { select: { id: true, lessons: { select: { id: true } } } } } },
      curriculumNodes: { select: { type: true, contentStatus: true } },
    },
  });
  return NextResponse.json({ data: levels });
}

/** Restores a missing fixed CEFR container; it never creates a seventh level. */
export async function POST(request: NextRequest) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    const input = cmsLanguageLevelSchema.parse(await request.json());
    const existing = await prisma.languageLevel.findUnique({ where: { code: input.code }, select: { id: true } });
    if (existing) return NextResponse.json({ error: `The ${input.code} level already exists.` }, { status: 409 });
    const levelCount = await prisma.languageLevel.count();
    if (levelCount >= 6) return NextResponse.json({ error: "The platform already has all six standard CEFR levels." }, { status: 409 });

    const level = await prisma.languageLevel.create({
      data: {
        code: input.code,
        title: input.title,
        description: input.description,
        coverImage: nullable(input.coverImage),
        seoTitle: nullable(input.seoTitle),
        seoDescription: nullable(input.seoDescription),
        seoKeywords: nullable(input.seoKeywords),
        order: standardOrder[input.code],
        isPublished: false,
        contentStatus: "DRAFT",
      },
    });
    await writeContentAudit(guard.user.id, "CREATE", "LanguageLevel", level.id, { code: level.code, restoredFixedContainer: true });
    await recordCmsContentVersion({ actorId: guard.user.id, entityType: "LANGUAGE_LEVEL", entityId: level.id, action: "CREATED", snapshot: level });
    return NextResponse.json({ data: level }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return NextResponse.json({ error: "This standard CEFR level already exists." }, { status: 409 });
    return NextResponse.json({ error: "Invalid level data." }, { status: 400 });
  }
}
