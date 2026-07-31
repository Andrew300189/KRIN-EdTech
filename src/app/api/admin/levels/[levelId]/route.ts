import { NextRequest, NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { prisma } from "@/core/server/prisma";
import { requireContentManager } from "@/modules/courses/server/content-access";
import { cefrLevelSchema } from "@/modules/courses/schemas/content.schemas";
import { writeContentAudit } from "@/modules/courses/services/content.service";

const updateLevelSchema = z.object({
  code: cefrLevelSchema.optional(),
  title: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().min(10).max(1000).optional(),
  order: z.number().int().min(1).max(100).optional(),
  isPublished: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ levelId: string }> }) {
  const guard = await requireContentManager(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    const { levelId } = await params;
    const input = updateLevelSchema.parse(await request.json());
    const level = await prisma.languageLevel.update({ where: { id: levelId }, data: input });
    await writeContentAudit(guard.user.id, "UPDATE", "LanguageLevel", level.id, { code: level.code });
    return NextResponse.json({ data: level });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "Invalid level data", issues: error.issues }, { status: 400 });
    return NextResponse.json({ error: "Unable to update level" }, { status: 400 });
  }
}
