import { type CurriculumNodeType } from "@/generated/prisma-client-payments-runtime";
import { prisma } from "@/core/server/prisma";
import type {
  CmsCourseCurriculumLinksInput,
  CmsCurriculumNodeDuplicateInput,
  CmsCurriculumNodeInput,
  CmsCurriculumNodeMoveInput,
  CmsCurriculumNodeTranslationInput,
  CmsCurriculumNodeUpdateInput,
} from "@/modules/cms/schemas/content-management.schemas";
import { recordCmsContentVersion } from "@/modules/cms/services/content-workflow.service";

const parentType: Record<CurriculumNodeType, CurriculumNodeType | null> = {
  SECTION: null,
  TOPIC: "SECTION",
  SUBTOPIC: "TOPIC",
};

async function nextNodeOrder(levelId: string, parentId: string | null, type: CurriculumNodeType) {
  const last = await prisma.curriculumNode.findFirst({
    where: { levelId, parentId, type, contentStatus: { not: "ARCHIVED" } },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  return (last?.order ?? 0) + 1;
}

async function validateParent(levelId: string, type: CurriculumNodeType, parentId?: string | null) {
  const expected = parentType[type];
  if (!expected && parentId) throw new Error("A section cannot have a parent.");
  if (expected && !parentId) throw new Error(`A ${type.toLowerCase()} must have a parent.`);
  if (!parentId) return;
  const parent = await prisma.curriculumNode.findUnique({ where: { id: parentId }, select: { id: true, levelId: true, type: true, contentStatus: true } });
  if (!parent) throw new Error("The selected parent curriculum item was not found.");
  if (parent.contentStatus === "ARCHIVED") throw new Error("An archived curriculum item cannot be used as a parent.");
  if (parent.levelId !== levelId) throw new Error("A curriculum item must belong to the same CEFR level as its parent.");
  if (parent.type !== expected) throw new Error(`A ${type.toLowerCase()} must be placed below a ${expected!.toLowerCase()}.`);
}

export async function listCurriculumNodes(input?: { levelCode?: string; type?: CurriculumNodeType; parentId?: string; includeArchived?: boolean }) {
  return prisma.curriculumNode.findMany({
    where: {
      ...(input?.levelCode ? { level: { code: input.levelCode as never } } : {}),
      ...(input?.type ? { type: input.type } : {}),
      ...(input?.parentId ? { parentId: input.parentId } : {}),
      ...(!input?.includeArchived ? { contentStatus: { not: "ARCHIVED" } } : {}),
    },
    orderBy: [{ level: { order: "asc" } }, { order: "asc" }, { title: "asc" }],
    include: {
      level: { select: { id: true, code: true, title: true } },
      parent: { select: { id: true, title: true, slug: true, type: true } },
      _count: { select: { children: true, courseLinks: true } },
      courseLinks: { orderBy: { createdAt: "asc" }, take: 10, include: { course: { select: { id: true, title: true, slug: true, contentStatus: true } } } },
      translations: { orderBy: { locale: "asc" }, select: { id: true, locale: true, title: true, description: true, seoTitle: true, seoDescription: true, seoKeywords: true } },
    },
  });
}

export async function createCurriculumNode(actorId: string, input: CmsCurriculumNodeInput) {
  const level = await prisma.languageLevel.findUnique({ where: { code: input.levelCode }, select: { id: true } });
  if (!level) throw new Error("CEFR level not found.");
  await validateParent(level.id, input.type, input.parentId);
  const archivedMatch = await prisma.curriculumNode.findFirst({
    where: {
      levelId: level.id,
      parentId: input.parentId ?? null,
      type: input.type,
      slug: input.slug,
      contentStatus: "ARCHIVED",
    },
    select: { id: true },
  });
  if (archivedMatch) {
    const node = await prisma.curriculumNode.update({
      where: { id: archivedMatch.id },
      data: {
        title: input.title,
        description: input.description?.trim() || null,
        locale: input.locale,
        seoTitle: input.seoTitle?.trim() || null,
        seoDescription: input.seoDescription?.trim() || null,
        seoKeywords: input.seoKeywords?.trim() || null,
        showOnHomepage: input.showOnHomepage,
        showInSearch: input.showInSearch,
        order: input.order ?? await nextNodeOrder(level.id, input.parentId ?? null, input.type),
        contentStatus: "DRAFT",
        scheduledAt: null,
        publishedAt: null,
        archivedAt: null,
      },
      include: { level: { select: { code: true } }, parent: { select: { title: true } } },
    });
    await prisma.contentAuditLog.create({ data: { actorId, action: "CMS_CURRICULUM_NODE_REACTIVATED", entityType: "CurriculumNode", entityId: node.id, metadata: { type: node.type, level: node.level.code, parent: node.parent?.title ?? null } } });
    await recordCmsContentVersion({ actorId, entityType: "CURRICULUM_NODE", entityId: node.id, action: "RESTORED", snapshot: node });
    return node;
  }
  const node = await prisma.curriculumNode.create({
    data: {
      levelId: level.id,
      parentId: input.parentId ?? null,
      type: input.type,
      slug: input.slug,
      title: input.title,
      description: input.description?.trim() || null,
      locale: input.locale,
      seoTitle: input.seoTitle?.trim() || null,
      seoDescription: input.seoDescription?.trim() || null,
      seoKeywords: input.seoKeywords?.trim() || null,
      showOnHomepage: input.showOnHomepage,
      showInSearch: input.showInSearch,
      order: input.order ?? await nextNodeOrder(level.id, input.parentId ?? null, input.type),
    },
    include: { level: { select: { code: true } }, parent: { select: { title: true } } },
  });
  await prisma.contentAuditLog.create({ data: { actorId, action: "CMS_CURRICULUM_NODE_CREATED", entityType: "CurriculumNode", entityId: node.id, metadata: { type: node.type, level: node.level.code, parent: node.parent?.title ?? null } } });
  await recordCmsContentVersion({ actorId, entityType: "CURRICULUM_NODE", entityId: node.id, action: "CREATED", snapshot: node });
  return node;
}

export async function updateCurriculumNode(actorId: string, nodeId: string, input: CmsCurriculumNodeUpdateInput) {
  const existing = await prisma.curriculumNode.findUnique({ where: { id: nodeId }, select: { id: true, levelId: true, type: true } });
  if (!existing) throw new Error("Curriculum item not found.");
  const node = await prisma.curriculumNode.update({
    where: { id: nodeId },
    data: {
      ...(input.slug ? { slug: input.slug } : {}),
      ...(input.title ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description.trim() || null } : {}),
      ...(input.locale !== undefined ? { locale: input.locale } : {}),
      ...(input.seoTitle !== undefined ? { seoTitle: input.seoTitle.trim() || null } : {}),
      ...(input.seoDescription !== undefined ? { seoDescription: input.seoDescription.trim() || null } : {}),
      ...(input.seoKeywords !== undefined ? { seoKeywords: input.seoKeywords.trim() || null } : {}),
      ...(input.showOnHomepage !== undefined ? { showOnHomepage: input.showOnHomepage } : {}),
      ...(input.showInSearch !== undefined ? { showInSearch: input.showInSearch } : {}),
    },
  });
  await prisma.contentAuditLog.create({ data: { actorId, action: "CMS_CURRICULUM_NODE_UPDATED", entityType: "CurriculumNode", entityId: node.id } });
  await recordCmsContentVersion({ actorId, entityType: "CURRICULUM_NODE", entityId: node.id, action: "UPDATED", snapshot: node });
  return node;
}

/** Changes a node's parent only inside its current CEFR level. This keeps all linked courses and learner URLs valid. */
export async function moveCurriculumNode(actorId: string, nodeId: string, input: CmsCurriculumNodeMoveInput) {
  const node = await prisma.curriculumNode.findUnique({
    where: { id: nodeId },
    include: { parent: { select: { id: true, slug: true } }, courseLinks: { include: { course: { select: { id: true, levelId: true } } } } },
  });
  if (!node) throw new Error("Curriculum item not found.");
  const nextParentId = input.parentId === undefined ? node.parentId : input.parentId;
  await validateParent(node.levelId, node.type, nextParentId);
  if (node.courseLinks.some((link) => link.course.levelId !== node.levelId)) throw new Error("A linked course belongs to another level. Repair its curriculum link before moving this item.");
  const moved = await prisma.curriculumNode.update({ where: { id: nodeId }, data: { parentId: nextParentId } });
  await prisma.contentAuditLog.create({ data: { actorId, action: "CMS_CURRICULUM_NODE_MOVED", entityType: "CurriculumNode", entityId: nodeId, metadata: { previousParentId: node.parentId, nextParentId, routeAffected: true, linkedCourseCount: node.courseLinks.length } } });
  await recordCmsContentVersion({ actorId, entityType: "CURRICULUM_NODE", entityId: nodeId, action: "UPDATED", snapshot: { ...moved, previousParentId: node.parentId, routeAffected: true } });
  return moved;
}

async function nextCopiedNodeSlug(levelId: string, type: CurriculumNodeType, sourceSlug: string) {
  const base = `${sourceSlug}-copy`.slice(0, 112);
  let candidate = base;
  let suffix = 2;
  while (await prisma.curriculumNode.findFirst({ where: { levelId, type, slug: candidate }, select: { id: true } })) {
    candidate = `${base}-${suffix}`.slice(0, 120);
    suffix += 1;
  }
  return candidate;
}

/** Copies the selected node and its descendants into a target level as drafts. Course links are never copied across levels. */
export async function duplicateCurriculumNode(actorId: string, nodeId: string, input: CmsCurriculumNodeDuplicateInput) {
  const source = await prisma.curriculumNode.findUnique({
    where: { id: nodeId },
    include: { translations: true, children: { orderBy: { order: "asc" }, include: { translations: true, children: { orderBy: { order: "asc" }, include: { translations: true } } } } },
  });
  if (!source) throw new Error("Curriculum item not found.");
  const targetLevel = await prisma.languageLevel.findUnique({ where: { code: input.targetLevelCode }, select: { id: true, code: true } });
  if (!targetLevel) throw new Error("Target CEFR level not found.");
  const targetParentId = input.targetParentId === undefined ? null : input.targetParentId;
  await validateParent(targetLevel.id, source.type, targetParentId);
  const rootSlug = await nextCopiedNodeSlug(targetLevel.id, source.type, source.slug);
  const rootOrder = await nextNodeOrder(targetLevel.id, targetParentId, source.type);

  const clone = await prisma.$transaction(async (tx) => {
    const root = await tx.curriculumNode.create({
      data: {
        levelId: targetLevel.id, parentId: targetParentId, type: source.type, slug: rootSlug, title: `${source.title} (copy)`, description: source.description,
        locale: source.locale, seoTitle: source.seoTitle, seoDescription: source.seoDescription, seoKeywords: source.seoKeywords,
        showOnHomepage: false, showInSearch: source.showInSearch, order: rootOrder, contentStatus: "DRAFT",
        translations: { create: source.translations.map((translation) => ({ locale: translation.locale, title: translation.title, description: translation.description, seoTitle: translation.seoTitle, seoDescription: translation.seoDescription, seoKeywords: translation.seoKeywords })) },
      },
    });
    for (const child of source.children) {
      const childSlug = await nextCopiedNodeSlug(targetLevel.id, child.type, child.slug);
      const copiedChild = await tx.curriculumNode.create({
        data: {
          levelId: targetLevel.id, parentId: root.id, type: child.type, slug: childSlug, title: `${child.title} (copy)`, description: child.description,
          locale: child.locale, seoTitle: child.seoTitle, seoDescription: child.seoDescription, seoKeywords: child.seoKeywords,
          showOnHomepage: false, showInSearch: child.showInSearch, order: child.order, contentStatus: "DRAFT",
          translations: { create: child.translations.map((translation) => ({ locale: translation.locale, title: translation.title, description: translation.description, seoTitle: translation.seoTitle, seoDescription: translation.seoDescription, seoKeywords: translation.seoKeywords })) },
        },
      });
      for (const grandchild of child.children) {
        const grandchildSlug = await nextCopiedNodeSlug(targetLevel.id, grandchild.type, grandchild.slug);
        await tx.curriculumNode.create({ data: { levelId: targetLevel.id, parentId: copiedChild.id, type: grandchild.type, slug: grandchildSlug, title: `${grandchild.title} (copy)`, description: grandchild.description, locale: grandchild.locale, seoTitle: grandchild.seoTitle, seoDescription: grandchild.seoDescription, seoKeywords: grandchild.seoKeywords, showOnHomepage: false, showInSearch: grandchild.showInSearch, order: grandchild.order, contentStatus: "DRAFT", translations: { create: grandchild.translations.map((translation) => ({ locale: translation.locale, title: translation.title, description: translation.description, seoTitle: translation.seoTitle, seoDescription: translation.seoDescription, seoKeywords: translation.seoKeywords })) } } });
      }
    }
    return root;
  });
  await prisma.contentAuditLog.create({ data: { actorId, action: "CMS_CURRICULUM_NODE_DUPLICATED", entityType: "CurriculumNode", entityId: clone.id, metadata: { sourceNodeId: source.id, targetLevel: targetLevel.code, copiedCourseLinks: false } } });
  await recordCmsContentVersion({ actorId, entityType: "CURRICULUM_NODE", entityId: clone.id, action: "DUPLICATED", snapshot: { sourceNodeId: source.id, targetLevel: targetLevel.code } });
  return clone;
}

export async function upsertCurriculumNodeTranslation(actorId: string, nodeId: string, input: CmsCurriculumNodeTranslationInput) {
  const node = await prisma.curriculumNode.findUnique({ where: { id: nodeId }, select: { id: true } });
  if (!node) throw new Error("Curriculum item not found.");
  const translation = await prisma.curriculumNodeTranslation.upsert({
    where: { nodeId_locale: { nodeId, locale: input.locale } },
    create: { nodeId, locale: input.locale, title: input.title, description: input.description?.trim() || null, seoTitle: input.seoTitle?.trim() || null, seoDescription: input.seoDescription?.trim() || null, seoKeywords: input.seoKeywords?.trim() || null },
    update: { title: input.title, description: input.description?.trim() || null, seoTitle: input.seoTitle?.trim() || null, seoDescription: input.seoDescription?.trim() || null, seoKeywords: input.seoKeywords?.trim() || null },
  });
  await prisma.contentAuditLog.create({ data: { actorId, action: "CMS_CURRICULUM_TRANSLATION_SAVED", entityType: "CurriculumNode", entityId: nodeId, metadata: { locale: input.locale } } });
  await recordCmsContentVersion({ actorId, entityType: "CURRICULUM_NODE", entityId: nodeId, action: "UPDATED", snapshot: { translation } });
  return translation;
}

export async function replaceCourseCurriculumLinks(actorId: string, courseId: string, input: CmsCourseCurriculumLinksInput) {
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true, levelId: true } });
  if (!course) throw new Error("Course not found.");
  const nodeIds = input.links.map((link) => link.nodeId);
  const nodes = nodeIds.length ? await prisma.curriculumNode.findMany({ where: { id: { in: nodeIds } }, select: { id: true, levelId: true, type: true, title: true } }) : [];
  if (nodes.length !== nodeIds.length) throw new Error("One or more curriculum items were not found.");
  if (nodes.some((node) => node.levelId !== course.levelId)) throw new Error("A course can only be linked to curriculum items in the same CEFR level.");

  const links = await prisma.$transaction(async (tx) => {
    await tx.courseCurriculumLink.deleteMany({ where: { courseId } });
    if (input.links.length) await tx.courseCurriculumLink.createMany({ data: input.links.map((link) => ({ courseId, nodeId: link.nodeId, relation: link.relation })) });
    const created = await tx.courseCurriculumLink.findMany({ where: { courseId }, include: { node: { select: { title: true, slug: true, type: true } } }, orderBy: [{ relation: "asc" }, { createdAt: "asc" }] });
    await tx.contentAuditLog.create({ data: { actorId, action: "CMS_COURSE_CURRICULUM_LINKS_REPLACED", entityType: "Course", entityId: courseId, metadata: { links: created.map((link) => ({ nodeId: link.nodeId, relation: link.relation })) } } });
    return created;
  });
  await recordCmsContentVersion({ actorId, entityType: "COURSE", entityId: courseId, action: "UPDATED", snapshot: { curriculumLinks: links.map((link) => ({ nodeId: link.nodeId, relation: link.relation, node: link.node })) } });
  return links;
}
