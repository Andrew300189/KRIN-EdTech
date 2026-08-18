import { notFound } from "next/navigation";
import { prisma } from "@/core/server/prisma";
import { CmsLessonTemplateSectionWorkspace } from "@/modules/cms/components/CmsLessonTemplateSectionWorkspace";
import { CmsPageShell } from "@/modules/cms/components/CmsPageShell";
import { getLessonTemplateDefinition } from "@/modules/cms/data/lesson-template-catalog";
import { getLessonTemplateSection } from "@/modules/cms/services/lesson-template-section.service";

export default async function CmsLessonTemplateSectionPage({
  params,
}: {
  params: Promise<{ sectionId: string }>;
}) {
  const { sectionId } = await params;
  const [section, modules] = await Promise.all([
    getLessonTemplateSection(sectionId),
    prisma.courseModule.findMany({
      where: { contentStatus: { not: "ARCHIVED" } },
      take: 300,
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, course: { select: { title: true } } },
    }),
  ]);
  if (!section) notFound();

  const templates = section.items
    .map((item) => getLessonTemplateDefinition(item.templateKey))
    .filter((template): template is NonNullable<typeof template> => template !== null);

  return (
    <CmsPageShell
      eyebrow="Lesson templates"
      title={section.title}
      description="Templates in this section are reusable source blueprints. Select a module only when you want to generate a new draft lesson."
    >
      <CmsLessonTemplateSectionWorkspace
        section={{ id: section.id, title: section.title, description: section.description }}
        templates={templates}
        modules={modules}
      />
    </CmsPageShell>
  );
}
