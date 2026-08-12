import { notFound, redirect } from "next/navigation";
import { getPublishedCourseBySlug } from "@/modules/courses/services/content.service";

/**
 * Stable public preview entry point. The slug is the course slug because a
 * lesson slug is only unique inside its course. We redirect exclusively to a
 * lesson the course has actually marked as available before purchase.
 */
export default async function LessonPreviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = await getPublishedCourseBySlug(slug);
  if (!course) notFound();

  const lessons = course.modules.flatMap((module) => module.lessons);
  const preview = lessons.find((lesson, index) => course.accessPlan === "FREE" || lesson.isFree || index < course.firstFreeLessonCount);
  if (!preview) notFound();
  redirect(`/courses/${encodeURIComponent(course.slug)}/lessons/${encodeURIComponent(preview.slug)}`);
}
