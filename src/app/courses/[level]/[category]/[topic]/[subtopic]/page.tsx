import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicCurriculumLayout } from "@/modules/courses/components/PublicCurriculumLayout";
import { PublicCurriculumCourseCards } from "@/modules/courses/components/PublicCurriculumCourseCards";
import { getPublishedCurriculumSubtopicPage } from "@/modules/courses/services/content.service";

const CEFR_LEVEL_CODES = new Set(["A1", "A2", "B1", "B2", "C1", "C2"]);

type RouteParams = { level: string; category: string; topic: string; subtopic: string };

async function getPage(params: RouteParams) {
  if (!CEFR_LEVEL_CODES.has(params.level.toUpperCase())) return null;
  return getPublishedCurriculumSubtopicPage(params.level, params.category, params.topic, params.subtopic);
}

export async function generateMetadata({ params }: { params: Promise<RouteParams> }): Promise<Metadata> {
  const route = await params;
  const page = await getPage(route);
  if (CEFR_LEVEL_CODES.has(route.level.toUpperCase()) && !page) notFound();
  if (!page) return { title: "Curriculum subtopic" };
  const canonical = `/courses/${page.level.code.toLowerCase()}/${route.category}/${route.topic}/${route.subtopic}`;
  const description = page.node.description ?? `${page.node.title} in the ${page.level.code} English curriculum.`;
  return { title: `${page.node.title} — ${page.level.code} English`, description, alternates: { canonical }, openGraph: { title: `${page.node.title} — ${page.level.code} English`, description, url: canonical } };
}

export default async function PublicCurriculumSubtopicPage({ params }: { params: Promise<RouteParams> }) {
  const route = await params;
  const page = await getPage(route);
  if (!page) notFound();

  const [section, topic, subtopic] = page.breadcrumbs;
  if (!section || !topic || !subtopic) notFound();
  const levelHref = `/courses/${page.level.code.toLowerCase()}`;
  const sectionHref = `${levelHref}/${section.slug}`;
  const topicHref = `${sectionHref}/${topic.slug}`;
  return <PublicCurriculumLayout
    breadcrumbs={[{ label: "Courses", href: "/courses" }, { label: page.level.code, href: levelHref }, { label: section.title, href: sectionHref }, { label: topic.title, href: topicHref }, { label: subtopic.title }]}
    eyebrow={`${page.level.code} · ${section.title}`}
    title={subtopic.title}
    description={subtopic.description ?? "This subtopic is scoped to the selected level, section, and topic."}
  >
    <PublicCurriculumCourseCards courses={page.courses} />
  </PublicCurriculumLayout>;
}
