import { notFound } from "next/navigation";
import { PublicCurriculumPage } from "@/modules/courses/components/PublicCurriculumPage";
import { getPublishedCurriculumSectionPage } from "@/modules/courses/services/content.service";

export default async function PublicSectionPage({ params }: { params: Promise<{ levelCode: string; sectionSlug: string }> }) {
  const { levelCode, sectionSlug } = await params;
  const page = await getPublishedCurriculumSectionPage(levelCode, sectionSlug);
  if (!page) notFound();
  return <PublicCurriculumPage page={page} currentPath={`/levels/${page.level.code.toLowerCase()}/sections/${page.node.slug}`} />;
}
