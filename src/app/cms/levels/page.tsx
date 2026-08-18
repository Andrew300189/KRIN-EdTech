import { prisma } from "@/core/server/prisma";
import { CmsLevelsWorkspace } from "@/modules/cms/components/CmsLevelsWorkspace";

export default async function CmsLevelsPage() {
  const levels = await prisma.languageLevel.findMany({
    orderBy: { order: "asc" },
    include: {
      _count: { select: { courses: true, curriculumNodes: { where: { contentStatus: { not: "ARCHIVED" } } } } },
      courses: {
        select: {
          id: true,
          contentStatus: true,
          modules: { select: { id: true, lessons: { select: { id: true } } } },
        },
      },
      curriculumNodes: {
        where: { contentStatus: { not: "ARCHIVED" } },
        orderBy: [{ type: "asc" }, { order: "asc" }, { title: "asc" }],
        select: { id: true, type: true, title: true, contentStatus: true, parent: { select: { title: true } } },
      },
    },
  });

  return <CmsLevelsWorkspace initialLevels={levels} />;
}
