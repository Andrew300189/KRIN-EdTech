import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/core/server/prisma";
import { CmsCreateTranslationDraftButton } from "@/modules/cms/components/CmsCreateTranslationDraftButton";
import { CmsCourseTranslationWorkspace } from "@/modules/cms/components/CmsCourseTranslationWorkspace";
import { CmsEmptyState, CmsPageShell } from "@/modules/cms/components/CmsPageShell";
import { defaultContentLocale, isTranslatableContentLocale, normalizeContentLocale } from "@/modules/courses/localization/content-locales";
import { getCourseTranslationWorkspace, listContentLocales, listCourseTranslationSummaries } from "@/modules/cms/services/course-localization.service";
import styles from "./translations.module.css";

type SearchParams = Promise<{ course?: string | string[]; locale?: string | string[] }>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CmsTranslationsPage({ searchParams }: { searchParams: SearchParams }) {
  const query = await searchParams;
  const courseId = first(query.course);
  const requestedLocale = first(query.locale);
  const [courses, locales] = await Promise.all([
    prisma.course.findMany({
      orderBy: [{ updatedAt: "desc" }],
      take: 80,
      select: {
        id: true,
        title: true,
        slug: true,
        level: { select: { code: true } },
        translations: { select: { locale: true, contentStatus: true } },
      },
    }),
    listContentLocales(),
  ]);

  if (!courseId) {
    return (
      <CmsPageShell
        compact
        dense
        eyebrow="Localization"
        title="Translations"
        description="Create learner-facing language versions without duplicating courses, lessons or learner progress."
      >
        {courses.length ? (
          <section className={styles.courseGrid} aria-label="Courses available for translation">
            {courses.map((course) => (
              <Link key={course.id} href={`/cms/translations?course=${course.id}`} className={styles.courseCard}>
                <div className={styles.cardHeader}>
                  <span className={styles.levelPill}>{course.level.code}</span>
                  <span className={styles.slug}>{course.slug}</span>
                </div>
                <h2 className={styles.cardTitle}>{course.title}</h2>
                <p className={styles.cardStatus}>
                  {course.translations.length
                    ? `Locales: ${course.translations.map((item) => `${item.locale.toUpperCase()} (${item.contentStatus.toLowerCase()})`).join(", ")}`
                    : "No localized drafts yet."}
                </p>
                <span className={styles.cardAction}>
                  Manage translations <span aria-hidden="true">→</span>
                </span>
              </Link>
            ))}
          </section>
        ) : (
          <CmsEmptyState title="No courses to translate" description="Create a course first. Its English content becomes the reusable source for every locale." />
        )}
      </CmsPageShell>
    );
  }

  const course = courses.find((item) => item.id === courseId);
  if (!course) notFound();
  const selectedLocale = normalizeContentLocale(requestedLocale);
  const summary = await listCourseTranslationSummaries(courseId);
  if (!summary) notFound();

  if (!requestedLocale || selectedLocale === defaultContentLocale) {
    return (
      <CmsPageShell
        compact
        dense
        eyebrow="Localization"
        title={course.title}
        description="Choose a language. Drafts copy visible source text while lessons, answers, progress and course structure stay shared."
        actions={<Link href="/cms/translations">All courses</Link>}
      >
        <section className={styles.localeGrid} aria-label={`Locales for ${course.title}`}>
          {summary.locales.map((locale) => (
            <article key={locale.code} className={styles.localeCard}>
              <div className={styles.cardHeader}>
                <span className={styles.localeCode}>{locale.code.toUpperCase()}</span>
                {locale.exists ? <span className={styles.statusPill}>{locale.status?.toLowerCase()}</span> : null}
              </div>
              <h2 className={styles.cardTitle}>{locale.nativeName}</h2>
              <p className={styles.cardStatus}>
                {locale.isBase
                  ? "Base source. Edit it in the course editor."
                  : locale.exists
                    ? `${locale.translatedUnits}/${summary.totalUnits} items translated`
                    : "No draft yet. Create it in the course editor."}
              </p>
              {!locale.isBase && locale.exists ? (
                <Link href={`/cms/translations?course=${course.id}&locale=${locale.code}`} className={styles.localeAction}>Edit locale</Link>
              ) : !locale.isBase ? (
                <CmsCreateTranslationDraftButton courseId={course.id} locale={locale.code} className={styles.localeAction} errorClassName={styles.actionError} />
              ) : null}
            </article>
          ))}
        </section>
      </CmsPageShell>
    );
  }

  if (!isTranslatableContentLocale(selectedLocale)) notFound();
  const workspace = await getCourseTranslationWorkspace(courseId, selectedLocale);
  if (!workspace) notFound();
  const localeLabel = locales.find((locale) => locale.code === selectedLocale)?.nativeName ?? selectedLocale.toUpperCase();

  return (
    <CmsPageShell
      compact
      dense
      eyebrow="Localization"
      title={`${course.title} · ${selectedLocale.toUpperCase()}`}
      description="Edit learner-facing copy only. Answers, scoring and student progress remain unchanged."
      actions={<Link href={`/cms/translations?course=${course.id}`}>All locales</Link>}
    >
      <CmsCourseTranslationWorkspace course={workspace} locale={selectedLocale} localeLabel={localeLabel} />
    </CmsPageShell>
  );
}
