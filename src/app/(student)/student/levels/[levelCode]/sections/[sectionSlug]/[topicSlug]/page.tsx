import { notFound } from "next/navigation";
import { CourseBreadcrumbs } from "@/modules/courses/components/CourseBreadcrumbs";
import { getLevel } from "@/modules/courses/utils/get-level";
import { getSection } from "@/modules/courses/utils/get-section";
import { getTopic } from "@/modules/courses/utils/get-topics";
import { DashboardBackButton } from "@/modules/teaching/components/DashboardBackButton";

export default async function StudentTopicDetailPage({
  params,
}: {
  params: Promise<{ levelCode: string; sectionSlug: string; topicSlug: string }>;
}) {
  const { levelCode, sectionSlug, topicSlug } = await params;
  const level = getLevel(levelCode);
  const section = getSection(levelCode, sectionSlug);
  const topic = getTopic(levelCode, sectionSlug, topicSlug);
  if (!level || !section || !topic) notFound();

  const levelHref = `/student/levels/${level.level.toLowerCase()}`;
  const sectionHref = `${levelHref}/sections/${section.slug}`;
  return <section className="space-y-6">
    <DashboardBackButton fallbackHref={sectionHref} label={`Back to ${section.title}`} />
    <CourseBreadcrumbs items={[{ label: "Levels", href: "/student/levels" }, { label: level.level, href: levelHref }, { label: section.title, href: sectionHref }, { label: topic.title }]} />
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-sm font-semibold text-blue-700">{level.level} · {section.title}</p>
      <h2 className="mt-2 text-3xl font-bold text-slate-950">{topic.title}</h2>
      {topic.description ? <p className="mt-4 max-w-3xl leading-7 text-slate-700">{topic.description}</p> : null}
      {topic.example ? <section className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-5" aria-label="Example"><h3 className="font-semibold text-blue-950">Example</h3><p className="mt-2 leading-7 text-blue-900">{topic.example}</p></section> : null}
    </article>
    <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6">
      <h3 className="text-lg font-bold text-slate-900">Related learning</h3>
      <p className="mt-2 text-slate-600">A linked course or lesson for this topic has not been added yet.</p>
    </section>
  </section>;
}
