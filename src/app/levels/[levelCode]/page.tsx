import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedLevelWithCourses } from "@/modules/courses/services/content.service";
import { getPublicCourseHref } from "@/modules/courses/utils/public-content-routes";
import { PublicSiteHeader } from "@/modules/navigation/components/PublicSiteHeader";
import styles from "./level-page.module.css";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ levelCode: string }>;
}): Promise<Metadata> {
  const level = await getPublishedLevelWithCourses((await params).levelCode);

  if (!level) return { title: "English level" };

  return {
    title: level.seoTitle || `${level.title} English courses`,
    description: level.seoDescription || level.description,
    keywords: level.seoKeywords
      ?.split(",")
      .map((keyword) => keyword.trim())
      .filter(Boolean),
  };
}

function accessLabel(plan: "FREE" | "BASIC" | "PREMIUM" | "PRO" | "CORPORATE") {
  if (plan === "FREE") return "Free";
  if (plan === "CORPORATE") return "Corporate";
  return "Subscription";
}

export default async function LevelCoursesPage({
  params,
}: {
  params: Promise<{ levelCode: string }>;
}) {
  const { levelCode } = await params;
  const level = await getPublishedLevelWithCourses(levelCode);

  if (!level) notFound();

  return (
    <main className={styles.page}>
      <PublicSiteHeader />

      <div className={styles.shell}>
        <Link href="/levels" className={styles.backLink}>
          All levels
        </Link>

        <header className={styles.header}>
          <span className={styles.levelBadge}>{level.code}</span>
          <div>
            <p className={styles.eyebrow}>CEFR level</p>
            <h1>{level.title} courses</h1>
            {level.description ? <p>{level.description}</p> : null}
          </div>
        </header>

        <section className={styles.coursesSection} aria-label={`${level.code} courses`}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>Available courses</p>
              <h2>Build your {level.code} foundation</h2>
            </div>
            <span className={styles.courseCount}>{level.courses.length} {level.courses.length === 1 ? "course" : "courses"}</span>
          </div>

          {level.courses.length === 0 ? (
            <div className={styles.emptyState}>
              <h2>Courses are being prepared</h2>
              <p>Published courses for this level will appear here as soon as they are ready.</p>
            </div>
          ) : (
            <div className={styles.courseGrid}>
              {level.courses.map((course) => (
                <Link
                  key={course.slug}
                  href={getPublicCourseHref(course.slug)}
                  className={styles.courseCard}
                  aria-label={`Open course: ${course.title}`}
                >
                  <div className={styles.cardTopline}>
                    <span className={styles.category}>{course.category.title}</span>
                    <span className={styles.access}>{accessLabel(course.accessPlan)}</span>
                  </div>
                  <h3>{course.title}</h3>
                  <p className={styles.description}>
                    {course.shortDescription || "Course details are being prepared."}
                  </p>
                  <div className={styles.cardFooter}>
                    <span>{course.lessonCount} {course.lessonCount === 1 ? "lesson" : "lessons"}</span>
                    <span>{course.estimatedDuration > 0 ? `${course.estimatedDuration} min` : "Self-paced"}</span>
                    <strong>Open course <span aria-hidden="true">→</span></strong>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
