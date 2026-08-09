import { notFound, redirect } from "next/navigation";
import { prisma } from "@/core/server/prisma";
import { getLevel } from "@/modules/courses/utils/get-level";
import { getSection } from "@/modules/courses/utils/get-section";
import { getTopic } from "@/modules/courses/utils/get-topics";
import { DashboardBackButton } from "@/modules/teaching/components/DashboardBackButton";

/**
 * Compatibility route for older database grammar-topic links.  The curriculum
 * topic tree uses the level-scoped sections route, so a requested level always
 * needs a requested section and can never fall back to another level.
 */
export default async function StudentTopicPage({
  params,
  searchParams,
}: {
  params: Promise<{ topicSlug: string }>;
  searchParams: Promise<{ level?: string; section?: string }>;
}) {
  const { topicSlug } = await params;
  const query = await searchParams;

  if (query.level || query.section) {
    if (!query.level || !query.section) notFound();
    const level = getLevel(query.level);
    const section = getSection(query.level, query.section);
    const topic = getTopic(query.level, query.section, topicSlug);
    if (!level || !section || !topic) notFound();
    redirect(`/student/levels/${level.level.toLowerCase()}/sections/${section.slug}/${topic.slug}`);
  }

  const databaseTopic = await prisma.grammarTopic.findFirst({
    where: { slug: topicSlug },
    select: { title: true, description: true, cefrLevel: true },
  });
  if (!databaseTopic) notFound();

  const levelCode = databaseTopic.cefrLevel;
  return <section className="space-y-6">
    <DashboardBackButton fallbackHref={`/student/levels/${levelCode.toLowerCase()}`} />
    <header className="rounded-2xl border bg-white p-7">
      <p className="text-sm font-semibold text-blue-700">{levelCode} · Grammar</p>
      <h2 className="mt-2 text-3xl font-bold">{databaseTopic.title}</h2>
      {databaseTopic.description ? <p className="mt-3 text-slate-600">{databaseTopic.description}</p> : null}
    </header>
  </section>;
}
