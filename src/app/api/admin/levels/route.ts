import { NextRequest, NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { prisma } from "@/core/server/prisma";
import { requireContentManager } from "@/modules/courses/server/content-access";
import { cefrLevelSchema } from "@/modules/courses/schemas/content.schemas";
import { writeContentAudit } from "@/modules/courses/services/content.service";

const levelSchema = z.object({
  code: cefrLevelSchema,
  title: z.string().trim().min(2).max(80),
  description: z.string().trim().min(10).max(1000),
  order: z.number().int().min(1).max(100),
  isPublished: z.boolean().default(false),
});

export async function GET(request: NextRequest) {
  const guard = await requireContentManager(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const levels = await prisma.languageLevel.findMany({
    orderBy: { order: "asc" },
    include: { _count: { select: { courses: true } } },
  });
  return NextResponse.json({ data: levels });
}

export async function POST(request: NextRequest) {
  const guard = await requireContentManager(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    const input = levelSchema.parse(await request.json());
    const level = await prisma.languageLevel.create({ data: input });
    await writeContentAudit(guard.user.id, "CREATE", "LanguageLevel", level.id, { code: level.code });
    return NextResponse.json({ data: level }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "Invalid level data", issues: error.issues }, { status: 400 });
    return NextResponse.json({ error: "Unable to create level" }, { status: 400 });
  }
}
