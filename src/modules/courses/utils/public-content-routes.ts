type CurriculumNodePath = {
  type: "SECTION" | "TOPIC" | "SUBTOPIC";
  slug: string;
  level: { code: string };
  parent?: {
    type: "SECTION" | "TOPIC" | "SUBTOPIC";
    slug: string;
    parent?: { type: "SECTION" | "TOPIC" | "SUBTOPIC"; slug: string } | null;
  } | null;
};

/** The canonical public URL for a CMS-managed course. */
export function getPublicCourseHref(slug: string) {
  return `/courses/${encodeURIComponent(slug)}`;
}

/**
 * Builds a URL only for a complete, published curriculum path. Returning null
 * for malformed data prevents a section/topic card from silently falling back
 * to an unrelated catalogue page.
 */
export function getPublicCurriculumHref(node: CurriculumNodePath): string | null {
  const level = encodeURIComponent(node.level.code.toLowerCase());
  const nodeSlug = encodeURIComponent(node.slug);

  if (node.type === "SECTION") return `/courses/${level}/${nodeSlug}`;
  if (node.type === "TOPIC" && node.parent?.type === "SECTION") {
    return `/courses/${level}/${encodeURIComponent(node.parent.slug)}/${nodeSlug}`;
  }
  if (node.type === "SUBTOPIC" && node.parent?.type === "TOPIC" && node.parent.parent?.type === "SECTION") {
    return `/courses/${level}/${encodeURIComponent(node.parent.parent.slug)}/${encodeURIComponent(node.parent.slug)}/${nodeSlug}`;
  }
  return null;
}

type CurriculumTreeNode = { id: string; parentId: string | null };

/** Returns the selected curriculum item and only its descendants. */
export function collectCurriculumDescendantIds<T extends CurriculumTreeNode>(nodes: readonly T[], rootId: string) {
  const descendants = new Set<string>([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of nodes) {
      if (node.parentId && descendants.has(node.parentId) && !descendants.has(node.id)) {
        descendants.add(node.id);
        changed = true;
      }
    }
  }
  return [...descendants];
}
