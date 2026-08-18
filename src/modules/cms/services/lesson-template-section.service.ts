import "server-only";

import { prisma } from "@/core/server/prisma";
import { getLessonTemplateDefinition } from "@/modules/cms/data/lesson-template-catalog";
import { instantiateGrammarTypicalLessonTemplate } from "@/modules/cms/services/lesson-blueprint.service";

type CreateSectionInput = {
  title: string;
  description?: string;
};

export async function listLessonTemplateSections() {
  return prisma.cmsLessonTemplateSection.findMany({
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    include: {
      _count: { select: { items: true } },
    },
  });
}

export async function getLessonTemplateSection(sectionId: string) {
  return prisma.cmsLessonTemplateSection.findUnique({
    where: { id: sectionId },
    include: {
      items: { orderBy: { order: "asc" } },
      _count: { select: { items: true } },
    },
  });
}

export async function createLessonTemplateSection(
  actorId: string,
  input: CreateSectionInput,
) {
  return prisma.$transaction(async (tx) => {
    const section = await tx.cmsLessonTemplateSection.create({
      data: {
        title: input.title,
        description: input.description || null,
        createdById: actorId,
      },
    });
    await tx.contentAuditLog.create({
      data: {
        actorId,
        action: "CMS_LESSON_TEMPLATE_SECTION_CREATED",
        entityType: "CmsLessonTemplateSection",
        entityId: section.id,
        metadata: { title: section.title },
      },
    });
    return section;
  });
}

export async function addLessonTemplateToSection(
  actorId: string,
  sectionId: string,
  templateKey: string,
) {
  const definition = getLessonTemplateDefinition(templateKey);
  if (!definition) throw new Error("Lesson template not found.");

  return prisma.$transaction(async (tx) => {
    const section = await tx.cmsLessonTemplateSection.findUnique({
      where: { id: sectionId },
      select: { id: true, title: true },
    });
    if (!section) throw new Error("Lesson template section not found.");

    const existing = await tx.cmsLessonTemplateSectionItem.findUnique({
      where: { sectionId_templateKey: { sectionId, templateKey } },
    });
    if (existing) return { item: existing, alreadyAdded: true };

    const lastItem = await tx.cmsLessonTemplateSectionItem.findFirst({
      where: { sectionId },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    const item = await tx.cmsLessonTemplateSectionItem.create({
      data: {
        sectionId,
        templateKey,
        order: (lastItem?.order ?? 0) + 1,
      },
    });
    await tx.contentAuditLog.create({
      data: {
        actorId,
        action: "CMS_LESSON_TEMPLATE_ADDED_TO_SECTION",
        entityType: "CmsLessonTemplateSection",
        entityId: section.id,
        metadata: { templateKey: definition.key, sectionTitle: section.title },
      },
    });
    return { item, alreadyAdded: false };
  });
}

export async function removeLessonTemplateFromSection(
  actorId: string,
  sectionId: string,
  templateKey: string,
) {
  return prisma.$transaction(async (tx) => {
    const item = await tx.cmsLessonTemplateSectionItem.findUnique({
      where: { sectionId_templateKey: { sectionId, templateKey } },
      select: { id: true },
    });
    if (!item) return false;

    await tx.cmsLessonTemplateSectionItem.delete({ where: { id: item.id } });
    await tx.contentAuditLog.create({
      data: {
        actorId,
        action: "CMS_LESSON_TEMPLATE_REMOVED_FROM_SECTION",
        entityType: "CmsLessonTemplateSection",
        entityId: sectionId,
        metadata: { templateKey },
      },
    });
    return true;
  });
}

export async function instantiateLessonTemplate(
  actorId: string,
  templateKey: string,
  targetModuleId: string,
) {
  if (templateKey === "grammar-typical-lesson-v1") {
    return instantiateGrammarTypicalLessonTemplate(actorId, targetModuleId);
  }

  throw new Error("Lesson template not found.");
}
