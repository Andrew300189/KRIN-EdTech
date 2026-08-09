import { prisma } from "@/core/server/prisma";
import { CmsCurriculumWorkspace } from "@/modules/cms/components/CmsCurriculumWorkspace";
import { listCurriculumNodes } from "@/modules/cms/services/curriculum.service";

export default async function CmsSubtopicsPage() {
  const [levels, nodes, parents] = await Promise.all([
    prisma.languageLevel.findMany({ orderBy: { order: "asc" }, select: { code: true, title: true } }),
    listCurriculumNodes({ type: "SUBTOPIC" }),
    listCurriculumNodes({ type: "TOPIC" }),
  ]);
  return <CmsCurriculumWorkspace type="SUBTOPIC" levels={levels} initialNodes={nodes} parentOptions={parents.map((parent) => ({ id: parent.id, title: parent.title, slug: parent.slug, level: { code: parent.level.code } }))} />;
}
