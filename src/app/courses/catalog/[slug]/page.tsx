import { redirect } from "next/navigation";

/**
 * Kept for older links. The canonical public page lives under /courses/[slug]
 * so visitors always reach the full outline and access state.
 */
export default async function LegacyCourseCatalogueRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/courses/${encodeURIComponent(slug)}`);
}
