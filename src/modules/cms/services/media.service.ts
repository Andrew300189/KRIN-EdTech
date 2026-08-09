import { Prisma } from "@/generated/prisma-client-payments-runtime";
import { prisma } from "@/core/server/prisma";
import type { CmsMediaAssetInput } from "@/modules/cms/schemas/content-management.schemas";

function nullable(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed || null;
}

export async function listManagedCmsMediaAssets(includeArchived = false) {
  return prisma.cmsMediaAsset.findMany({
    where: includeArchived ? {} : { isArchived: false },
    orderBy: { createdAt: "desc" },
    include: { uploadedBy: { select: { id: true, name: true, email: true } }, _count: { select: { links: true } } },
  });
}

export async function createCmsMediaAsset(actorId: string, input: CmsMediaAssetInput) {
  const asset = await prisma.cmsMediaAsset.create({
    data: {
      kind: input.kind,
      url: input.url,
      storageKey: nullable(input.storageKey),
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      width: input.width,
      height: input.height,
      durationMs: input.durationMs,
      altText: nullable(input.altText),
      caption: nullable(input.caption),
      metadata: input.metadata === undefined ? undefined : input.metadata as Prisma.InputJsonValue,
      uploadedById: actorId,
    },
  });
  await prisma.contentAuditLog.create({ data: { actorId, action: "CMS_MEDIA_CREATED", entityType: "CmsMediaAsset", entityId: asset.id, metadata: { kind: asset.kind, fileName: asset.fileName } } });
  return asset;
}

export async function updateCmsMediaAsset(actorId: string, mediaId: string, input: Partial<CmsMediaAssetInput> & { isArchived?: boolean }) {
  const asset = await prisma.cmsMediaAsset.update({
    where: { id: mediaId },
    data: {
      ...(input.kind ? { kind: input.kind } : {}),
      ...(input.url ? { url: input.url } : {}),
      ...(input.storageKey !== undefined ? { storageKey: nullable(input.storageKey) } : {}),
      ...(input.fileName ? { fileName: input.fileName } : {}),
      ...(input.mimeType ? { mimeType: input.mimeType } : {}),
      ...(input.sizeBytes !== undefined ? { sizeBytes: input.sizeBytes } : {}),
      ...(input.width !== undefined ? { width: input.width } : {}),
      ...(input.height !== undefined ? { height: input.height } : {}),
      ...(input.durationMs !== undefined ? { durationMs: input.durationMs } : {}),
      ...(input.altText !== undefined ? { altText: nullable(input.altText) } : {}),
      ...(input.caption !== undefined ? { caption: nullable(input.caption) } : {}),
      ...(input.metadata !== undefined ? { metadata: input.metadata as Prisma.InputJsonValue } : {}),
      ...(input.isArchived !== undefined ? { isArchived: input.isArchived } : {}),
    },
  });
  await prisma.contentAuditLog.create({ data: { actorId, action: input.isArchived ? "CMS_MEDIA_ARCHIVED" : "CMS_MEDIA_UPDATED", entityType: "CmsMediaAsset", entityId: asset.id, metadata: { kind: asset.kind, fileName: asset.fileName } } });
  return asset;
}
