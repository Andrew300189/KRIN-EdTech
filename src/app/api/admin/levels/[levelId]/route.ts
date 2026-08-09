import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/core/server/prisma";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { cmsLanguageLevelUpdateSchema } from "@/modules/cms/schemas/content-management.schemas";
import { recordCmsContentVersion } from "@/modules/cms/services/content-workflow.service";
import { writeContentAudit } from "@/modules/courses/services/content.service";

function optionalNullable(value: string | undefined) {
  return value === undefined ? undefined : value.trim() || null;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ levelId: string }> }) {
  const guard = await requirePlatformOwner(request);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  try {
    const { levelId } = await params;
    const input = cmsLanguageLevelUpdateSchema.parse(await request.json());
    const level = await prisma.languageLevel.update({
      where: { id: levelId },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.coverImage !== undefined ? { coverImage: optionalNullable(input.coverImage) } : {}),
        ...(input.seoTitle !== undefined ? { seoTitle: optionalNullable(input.seoTitle) } : {}),
        ...(input.seoDescription !== undefined ? { seoDescription: optionalNullable(input.seoDescription) } : {}),
        ...(input.seoKeywords !== undefined ? { seoKeywords: optionalNullable(input.seoKeywords) } : {}),
      },
    });
    await writeContentAudit(guard.user.id, "UPDATE", "LanguageLevel", level.id, { code: level.code });
    await recordCmsContentVersion({ actorId: guard.user.id, entityType: "LANGUAGE_LEVEL", entityId: level.id, action: "UPDATED", snapshot: level });
    return NextResponse.json({ data: level });
  } catch (error) {
    const message = error instanceof Error && error.message.includes("Record to update not found") ? "Level not found." : "Invalid level data.";
    return NextResponse.json({ error: message }, { status: message === "Level not found." ? 404 : 400 });
  }
}
