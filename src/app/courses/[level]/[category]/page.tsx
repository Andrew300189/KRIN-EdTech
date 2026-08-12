import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicCurriculumLayout } from "@/modules/courses/components/PublicCurriculumLayout";
import styles from "@/modules/courses/components/PublicCurriculumCards.module.css";
import { getPublishedCurriculumSectionPage } from "@/modules/courses/services/content.service";

const CEFR_LEVEL_CODES = new Set(["A1", "A2", "B1", "B2", "C1", "C2"]);

export async function generateMetadata({ params }: { params: Promise<{ level: string; category: string }> }): Promise<Metadata> {
  const { level: levelSlug, category: sectionSlug } = await params;
  const page = await getPublishedCurriculumSectionPage(levelSlug, sectionSlug);
  if (CEFR_LEVEL_CODES.has(levelSlug.toUpperCase()) && !page) notFound();
  const level = page ? { level: page.level.code } : null;
  const section = page?.node ?? null;
  if (!level || !section) return { title: "Curriculum section" };

  const canonical = `/courses/${level.level.toLowerCase()}/${section.slug}`;
  const description = `${section.title} topics for ${level.level} English. ${section.description ?? "Explore the scoped public curriculum."}`;
  return { title: `${section.title} — ${level.level} English`, description, alternates: { canonical }, openGraph: { title: `${section.title} — ${level.level} English`, description, url: canonical } };
}

export default async function PublicCurriculumSectionPage({
  params,
}: {
  params: Promise<{ level: string; category: string }>;
}) {
  const { level: levelSlug, category: sectionSlug } = await params;
  const page = await getPublishedCurriculumSectionPage(levelSlug, sectionSlug);
  const level = page ? { level: page.level.code } : null;
  const section = page ? { ...page.node, topics: page.childNodes.map((topic) => ({ ...topic, example: undefined as string | undefined })) } : null;
  if (!level || !section) notFound();

  const levelHref = `/courses/${level.level.toLowerCase()}`;
  return (
    <PublicCurriculumLayout
      breadcrumbs={[{ label: "Courses", href: "/courses" }, { label: level.level, href: levelHref }, { label: section.title }]}
      eyebrow={`${level.level} curriculum · ${section.topics.length} topics`}
      title={section.title}
      description={section.description ?? `Explore the ${level.level} topics in this part of the curriculum. Each topic remains scoped to this level.`}
    >
      {section.topics.length ? (
        <section className={styles.grid} aria-label={`${section.title} topics`}>
          {section.topics.map((topic) => (
            <Link key={topic.id} href={`${levelHref}/${section.slug}/${topic.slug}`} className={styles.card} aria-label={`Open ${topic.title} for ${level.level}`}>
              <p className={styles.meta}>{level.level} topic {topic.order}</p>
              <h2>{topic.title}</h2>
              {topic.description ? <p className={styles.description}>{topic.description}</p> : null}
              {topic.example ? <p className={styles.examples}>Example: {topic.example}</p> : null}
              <span className={styles.cta}>Open topic <span aria-hidden="true">→</span></span>
            </Link>
          ))}
        </section>
      ) : <p className={styles.empty}>This section exists, but its public topics are still being prepared. No topics from another level are shown here.</p>}
    </PublicCurriculumLayout>
  );
}
