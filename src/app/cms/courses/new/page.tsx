import Link from "next/link";
import { prisma } from "@/core/server/prisma";
import { CmsCourseCreationWizard } from "@/modules/cms/components/CmsCourseCreationWizard";
import { CmsPageShell } from "@/modules/cms/components/CmsPageShell";

export default async function CmsNewCoursePage({ searchParams }: { searchParams: Promise<{ level?: string }> }) {
  const [levels, categories, authors, curriculumNodes] = await Promise.all([
    prisma.languageLevel.findMany({ orderBy: { order: "asc" }, select: { code: true, title: true } }),
    prisma.courseCategory.findMany({ orderBy: { order: "asc" }, select: { slug: true, title: true } }),
    prisma.user.findMany({ orderBy: [{ role: "asc" }, { email: "asc" }], take: 500, select: { id: true, name: true, email: true, role: true } }),
    prisma.curriculumNode.findMany({ orderBy: [{ level: { order: "asc" } }, { order: "asc" }], select: { id: true, type: true, title: true, slug: true, parentId: true, level: { select: { code: true } } } }),
  ]);
  const selectedLevel = (await searchParams).level?.toUpperCase();
  return <CmsPageShell eyebrow="Learning content" title="Create course" description="Create one canonical course draft, build its content, validate it and publish it without leaving the CMS workflow." actions={<Link href="/cms/courses" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-white">Back to courses</Link>}><CmsCourseCreationWizard levels={levels} categories={categories} authors={authors} curriculumNodes={curriculumNodes.map((node) => ({ id: node.id, type: node.type, title: node.title, slug: node.slug, parentId: node.parentId, levelCode: node.level.code }))} initialLevelCode={selectedLevel} /></CmsPageShell>;
}
