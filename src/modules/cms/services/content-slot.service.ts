import { Prisma } from "@/generated/prisma-client-payments-runtime";
import { prisma } from "@/core/server/prisma";
import type { CmsContentSlotInput } from "@/modules/cms/schemas/content-management.schemas";
import { recordCmsContentVersion } from "@/modules/cms/services/content-workflow.service";

function json(value: CmsContentSlotInput["content"]): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export async function listManagedCmsContentSlots() {
  return prisma.cmsContentSlot.findMany({ orderBy: [{ area: "asc" }, { key: "asc" }] });
}

export async function createCmsContentSlot(actorId: string, input: CmsContentSlotInput) {
  const slot = await prisma.cmsContentSlot.create({
    data: {
      key: input.key,
      area: input.area,
      title: input.title,
      content: json(input.content),
      createdById: actorId,
      updatedById: actorId,
    },
  });
  await prisma.contentAuditLog.create({ data: { actorId, action: "CMS_CONTENT_SLOT_CREATED", entityType: "CmsContentSlot", entityId: slot.id, metadata: { key: slot.key, area: slot.area } } });
  await recordCmsContentVersion({ actorId, entityType: "CONTENT_SLOT", entityId: slot.id, action: "CREATED", snapshot: slot });
  return slot;
}

export async function updateCmsContentSlot(actorId: string, slotId: string, input: Partial<CmsContentSlotInput>) {
  const slot = await prisma.cmsContentSlot.update({
    where: { id: slotId },
    data: {
      ...(input.key ? { key: input.key } : {}),
      ...(input.area ? { area: input.area } : {}),
      ...(input.title ? { title: input.title } : {}),
      ...(input.content !== undefined ? { content: json(input.content) } : {}),
      updatedById: actorId,
    },
  });
  await prisma.contentAuditLog.create({ data: { actorId, action: "CMS_CONTENT_SLOT_UPDATED", entityType: "CmsContentSlot", entityId: slot.id, metadata: { key: slot.key, area: slot.area } } });
  await recordCmsContentVersion({ actorId, entityType: "CONTENT_SLOT", entityId: slot.id, action: "UPDATED", snapshot: slot });
  return slot;
}

export async function getPublishedCmsContentSlot(key: string) {
  return prisma.cmsContentSlot.findFirst({
    where: { key, contentStatus: "PUBLISHED" },
    select: { key: true, area: true, title: true, content: true, publishedAt: true },
  });
}
