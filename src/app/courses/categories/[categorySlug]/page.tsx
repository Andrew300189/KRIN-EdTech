import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "./category.module.css";
import { normalizeCefrLevelCode } from "@/modules/courses/services/content.service";
import { getPublishedCourseCategoryBySlug } from "@/modules/courses/services/content.service";
import { getPublicCourseHref } from "@/modules/courses/utils/public-content-routes";
import { PublicSiteHeader } from "@/modules/navigation/components/PublicSiteHeader";
import { LocalizedText } from "@/core/i18n/LocalizedText";

export default async function CategoryCoursesPage({ params, searchParams }: { params: Promise<{ categorySlug: string }>; searchParams?: Promise<{ level?: string | string[] }> }) {
  const { categorySlug } = await params;
  const category = await getPublishedCourseCategoryBySlug(categorySlug);
  if (!category) notFound();

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const rawLevel = Array.isArray(resolvedSearchParams.level) ? resolvedSearchParams.level[0] : resolvedSearchParams.level;
  const activeLevel = rawLevel ? normalizeCefrLevelCode(rawLevel) : null;
  const courses = activeLevel ? category.courses.filter((course) => course.level.code === activeLevel) : category.courses;
  const titleSuffix = activeLevel ? ` · ${activeLevel}` : "";

  return (
    <main className={styles.page}>
      <PublicSiteHeader />
      <div className={styles.shell}>
        <Link href="/courses" className={styles.back}>
          <LocalizedText id="course.category.back" fallback="← All courses" />
        </Link>

        <header className={styles.hero}>
          <p className={styles.eyebrow}>
            <LocalizedText id="course.category.eyebrow" fallback="Course direction" />
          </p>
          <h1>{category.icon ? `${category.icon} ` : ""}{category.title}{titleSuffix}</h1>
          {category.description ? <p className={styles.description}>{category.description}</p> : null}
        </header>

        {courses.length === 0 ? (
          <section className={styles.empty}>
            <h2><LocalizedText id="course.category.empty.title" fallback="Courses are being prepared." /></h2>
            <p>
              {activeLevel ? (
                <LocalizedText id="course.category.empty.level" fallback={`Published courses for ${category.title} at ${activeLevel} are being prepared.`} values={{ category: category.title, level: activeLevel }} />
              ) : (
                <LocalizedText id="course.category.empty.default" fallback="Published courses in this direction are being prepared." />
              )}
            </p>
          </section>
        ) : (
          <section className={styles.courseGrid} aria-label={`${category.title} courses`}>
            {courses.map((course) => (
              <article key={course.id} className={styles.courseCard}>
                <div className={styles.cardTopline}>
                  <span className={styles.levelBadge}>{course.level.code}</span>
                  <span className={course.accessPlan === "FREE" ? styles.freeBadge : styles.accessBadge}>
                    {course.accessPlan === "FREE" ? (
                      <LocalizedText id="course.category.access.free" fallback="Free" />
                    ) : course.accessPlan === "PREMIUM" ? (
                      <LocalizedText id="course.category.access.premium" fallback="Premium" />
                    ) : (
                      <LocalizedText id="course.category.access.corporate" fallback="Corporate" />
                    )}
                  </span>
                </div>
                <h2>{course.title}</h2>
                <p className={styles.cardDescription}>{course.shortDescription}</p>
                <p className={styles.courseFacts}>
                  <LocalizedText id="course.category.facts" fallback="{count} lessons · {minutes} min" values={{ count: course.lessonCount, minutes: course.estimatedDuration || "—" }} />
                </p>
                <Link href={getPublicCourseHref(course.slug)} className={styles.courseCta}>
                  <LocalizedText id="course.category.open" fallback="View course →" />
                </Link>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
