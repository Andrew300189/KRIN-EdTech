import { notFound } from "next/navigation";
import { CourseBreadcrumbs } from "@/modules/courses/components/CourseBreadcrumbs";
import { EmptyCategoryState } from "@/modules/courses/components/EmptyCategoryState";
import { TopicCard } from "@/modules/courses/components/TopicCard";
import { getLevel } from "@/modules/courses/utils/get-level";
import { getSection } from "@/modules/courses/utils/get-section";
import { DashboardBackButton } from "@/modules/teaching/components/DashboardBackButton";

export default async function StudentSectionPage({
  params,
}: {
  params: Promise<{ levelCode: string; sectionSlug: string }>;
}) {
  const { levelCode, sectionSlug } = await params;
  const level = getLevel(levelCode);
  const section = getSection(levelCode, sectionSlug);
  if (!level || !section) notFound();

  const levelHref = `/student/levels/${level.level.toLowerCase()}`;
  return <section className="space-y-6">
    <DashboardBackButton fallbackHref={levelHref} label={`Back to ${level.level}`} />
    <CourseBreadcrumbs items={[{ label: "Levels", href: "/student/levels" }, { label: level.level, href: levelHref }, { label: section.title }]} />
    <header>
      <p className="text-sm font-semibold text-blue-700">{level.level} · {section.topics.length} topics</p>
      <h2 className="mt-1 text-3xl font-bold">{section.title}</h2>
      {section.description ? <p className="mt-2 max-w-3xl text-slate-600">{section.description}</p> : null}
    </header>
    {section.topics.length === 0 ? <EmptyCategoryState message="Content for this section has not been added yet." /> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {section.topics.map((topic) => <TopicCard key={topic.id} level={level.level} section={section.slug} topic={topic} />)}
    </div>}
  </section>;
}
