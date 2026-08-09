import { notFound } from "next/navigation";
import { PublicCurriculumPage } from "@/modules/courses/components/PublicCurriculumPage";
import { getPublishedCurriculumSubtopicPage } from "@/modules/courses/services/content.service";

export default async function PublicSubtopicPage({ params }: { params: Promise<{ levelCode: string; sectionSlug: string; topicSlug: string; subtopicSlug: string }> }) {
  const { levelCode, sectionSlug, topicSlug, subtopicSlug } = await params;
  const page = await getPublishedCurriculumSubtopicPage(levelCode, sectionSlug, topicSlug, subtopicSlug);
  if (!page) notFound();
  return <PublicCurriculumPage page={page} currentPath={`/levels/${page.level.code.toLowerCase()}/sections/${page.breadcrumbs[0].slug}/${page.breadcrumbs[1].slug}/${page.node.slug}`} />;
}
