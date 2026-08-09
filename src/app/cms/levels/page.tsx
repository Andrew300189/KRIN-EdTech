import { prisma } from "@/core/server/prisma";
import { CmsLevelsWorkspace } from "@/modules/cms/components/CmsLevelsWorkspace";

export default async function CmsLevelsPage() {
  const levels = await prisma.languageLevel.findMany({
    orderBy: { order: "asc" },
    include: {
      _count: { select: { courses: true, curriculumNodes: true } },
      courses: {
        select: {
          id: true,
          contentStatus: true,
          modules: { select: { id: true, lessons: { select: { id: true } } } },
        },
      },
      curriculumNodes: { select: { type: true, contentStatus: true } },
    },
  });

  return <CmsLevelsWorkspace initialLevels={levels} />;
}
