import { prisma } from "@/core/server/prisma";
import { CmsCurriculumWorkspace } from "@/modules/cms/components/CmsCurriculumWorkspace";
import { listCurriculumNodes } from "@/modules/cms/services/curriculum.service";

export default async function CmsSectionsPage() {
  const [levels, nodes] = await Promise.all([
    prisma.languageLevel.findMany({ orderBy: { order: "asc" }, select: { code: true, title: true } }),
    listCurriculumNodes({ type: "SECTION" }),
  ]);
  return <CmsCurriculumWorkspace type="SECTION" levels={levels} initialNodes={nodes} parentOptions={[]} />;
}
