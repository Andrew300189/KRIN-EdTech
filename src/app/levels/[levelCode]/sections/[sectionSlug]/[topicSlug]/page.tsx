import { notFound } from "next/navigation";
import { PublicCurriculumPage } from "@/modules/courses/components/PublicCurriculumPage";
import { getPublishedCurriculumTopicPage } from "@/modules/courses/services/content.service";

export default async function PublicTopicPage({ params }: { params: Promise<{ levelCode: string; sectionSlug: string; topicSlug: string }> }) {
  const { levelCode, sectionSlug, topicSlug } = await params;
  const page = await getPublishedCurriculumTopicPage(levelCode, sectionSlug, topicSlug);
  if (!page) notFound();
  return <PublicCurriculumPage page={page} currentPath={`/levels/${page.level.code.toLowerCase()}/sections/${page.breadcrumbs[0].slug}/${page.node.slug}`} />;
}
