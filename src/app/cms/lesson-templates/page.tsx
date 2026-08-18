import { CmsLessonTemplateLibrary } from "@/modules/cms/components/CmsLessonTemplateLibrary";
import { CmsPageShell } from "@/modules/cms/components/CmsPageShell";
import { LESSON_TEMPLATE_CATALOG } from "@/modules/cms/data/lesson-template-catalog";
import { listLessonTemplateSections } from "@/modules/cms/services/lesson-template-section.service";

export default async function CmsLessonTemplatesPage() {
  const sections = await listLessonTemplateSections();

  return (
    <CmsPageShell
      eyebrow="Learning content"
      title="Lesson templates"
      description="Organise reusable lesson blueprints into named sections. A section has its own CMS page and can hold the lesson templates you select."
    >
      <CmsLessonTemplateLibrary sections={sections} templates={LESSON_TEMPLATE_CATALOG} />
    </CmsPageShell>
  );
}
