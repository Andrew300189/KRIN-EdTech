import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import styles from "./catalog.module.css";
import {
  countPublishedCourses,
  listPublishedCourseCategories,
  listPublishedCourses,
  listPublishedLanguageLevels,
} from "@/modules/courses/services/content.service";
import type { CourseCatalogFilters } from "@/modules/courses/services/content.service";
import { getPublicCourseHref } from "@/modules/courses/utils/public-content-routes";
import { FunnelEventReporter } from "@/modules/analytics/components/FunnelEventReporter";
import { PublicSiteHeader } from "@/modules/navigation/components/PublicSiteHeader";

export const metadata: Metadata = {
  title: "English course catalogue",
  description:
    "Browse published English courses by CEFR level, focus, format and access type.",
  alternates: { canonical: "/courses" },
  openGraph: {
    title: "English course catalogue",
    description:
      "Browse published English courses by CEFR level, focus, format and access type.",
    url: "/courses",
  },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const pageSize = 12;
const courseTypes = [
  "STANDARD",
  "INTENSIVE",
  "EXAM_PREP",
  "PROFESSIONAL",
  "SPECIALIZATION",
  "SKILL",
] as const;
const typeLabels: Record<(typeof courseTypes)[number], string> = {
  STANDARD: "Standard",
  INTENSIVE: "Intensive",
  EXAM_PREP: "Exam prep",
  PROFESSIONAL: "Professional",
  SPECIALIZATION: "Specialisation",
  SKILL: "Skill course",
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
function makeQuery(values: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const query = params.toString();
  return query ? `?${query}` : "";
}
function accessLabel(plan: "FREE" | "BASIC" | "PREMIUM" | "PRO" | "CORPORATE") {
  return plan === "FREE"
    ? "Free"
    : plan === "CORPORATE"
      ? "Corporate"
      : "Subscription";
}
function formatPrice(amount: number | null, currency: string) {
  return amount === null
    ? null
    : new Intl.NumberFormat("en", { style: "currency", currency }).format(
        amount / 100,
      );
}

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const requestedPage = Number(first(params.page) ?? "1");
  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const levelCode = first(params.level)?.toUpperCase();
  const categorySlug = first(params.category);
  const access = first(params.access);
  const sort = first(params.sort);
  const query = first(params.q);
  const requestedType = first(params.type);
  const courseType = courseTypes.find((type) => type === requestedType);
  const filters: CourseCatalogFilters = {
    query,
    levelCode,
    categorySlug,
    courseType,
    accessPlan:
      access === "FREE" || access === "PREMIUM" || access === "CORPORATE"
        ? access
        : undefined,
    sort: sort === "title" || sort === "duration" ? sort : "newest",
    page,
    pageSize,
  };
  const [courses, total, levels, categories] = await Promise.all([
    listPublishedCourses(filters),
    countPublishedCourses(filters),
    listPublishedLanguageLevels(),
    listPublishedCourseCategories(),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (page > totalPages && total > 0) notFound();
  const baseQuery = {
    q: query,
    level: levelCode,
    category: categorySlug,
    type: courseType,
    access: filters.accessPlan,
    sort: filters.sort === "newest" ? undefined : filters.sort,
  };
  const hasActiveFilters = Boolean(
    query ||
    levelCode ||
    categorySlug ||
    courseType ||
    filters.accessPlan ||
    filters.sort !== "newest",
  );

  return (
    <main className={styles.page}>
      <PublicSiteHeader />
      <div className={styles.shell}>
        <FunnelEventReporter eventType="COURSE_CATALOG_VIEW" />
        {hasActiveFilters ? (
          <FunnelEventReporter
            eventType="COURSE_FILTER_USED"
            levelCode={
              levelCode === "A1" ||
              levelCode === "A2" ||
              levelCode === "B1" ||
              levelCode === "B2" ||
              levelCode === "C1" ||
              levelCode === "C2"
                ? levelCode
                : undefined
            }
          />
        ) : null}
        <header className={styles.header}>
          <p className={styles.eyebrow}>Course catalogue</p>
          <h1>Find a published English course.</h1>
          <p>
            Use level, focus, format and access filters to narrow the live
            catalogue. Courses from one level are never used as a fallback for
            another.
          </p>
        </header>

        <form className={styles.filters} method="get">
          <label className={styles.field}>
            Search published courses
            <input
              name="q"
              defaultValue={query}
              placeholder="Course title, focus or topic"
            />
          </label>
          <label className={styles.field}>
            Level
            <select name="level" defaultValue={levelCode ?? ""}>
              <option value="">All levels</option>
              {levels.map((level) => (
                <option key={level.id} value={level.code}>
                  {level.code} — {level.title}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            Focus or goal
            <select name="category" defaultValue={categorySlug ?? ""}>
              <option value="">All directions</option>
              {categories
                .filter((category) => category._count.courses > 0)
                .map((category) => (
                  <option key={category.id} value={category.slug}>
                    {category.title}
                  </option>
                ))}
            </select>
          </label>
          <label className={styles.field}>
            Format
            <select name="type" defaultValue={courseType ?? ""}>
              <option value="">All formats</option>
              {courseTypes.map((type) => (
                <option key={type} value={type}>
                  {typeLabels[type]}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            Access
            <select name="access" defaultValue={filters.accessPlan ?? ""}>
              <option value="">All access</option>
              <option value="FREE">Free</option>
              <option value="PREMIUM">Subscription</option>
              <option value="CORPORATE">Corporate</option>
            </select>
          </label>
          <label className={styles.field}>
            Sort
            <select name="sort" defaultValue={filters.sort}>
              <option value="newest">Newest first</option>
              <option value="title">Title A–Z</option>
              <option value="duration">Shortest first</option>
            </select>
          </label>
          <button className={styles.submit}>Apply</button>
          <Link href="/courses" className={styles.reset}>
            Reset
          </Link>
        </form>

        {categories.some((category) => category._count.courses > 0) ? (
          <section
            className={styles.directions}
            aria-label="Published course directions"
          >
            <h2>Browse by direction</h2>
            <div className={styles.directionList}>
              {categories
                .filter((category) => category._count.courses > 0)
                .map((category) => (
                  <Link
                    key={category.id}
                    href={`/courses${makeQuery({ category: category.slug })}`}
                    className={styles.direction}
                  >
                    {category.icon ? (
                      <span aria-hidden="true">{category.icon} </span>
                    ) : null}
                    {category.title}
                  </Link>
                ))}
            </div>
          </section>
        ) : null}

        <section className={styles.catalogue} aria-label="Published courses">
          <div className={styles.catalogueHeading}>
            <h2>Available courses</h2>
            <p>
              {total} {total === 1 ? "course" : "courses"}
            </p>
          </div>
          {courses.length ? (
            <div className={styles.grid}>
              {courses.map((course) => {
                const price = formatPrice(
                  course.priceAmount,
                  course.priceCurrency,
                );
                return (
                  <Link
                    key={course.id}
                    href={getPublicCourseHref(course.slug)}
                    className={styles.card}
                  >
                    <div className={styles.chips}>
                      <span>{course.level.code}</span>
                      <span>{course.category.title}</span>
                      <span>{typeLabels[course.courseType]}</span>
                      <span
                        className={
                          course.accessPlan === "FREE"
                            ? styles.free
                            : styles.premium
                        }
                      >
                        {accessLabel(course.accessPlan)}
                      </span>
                    </div>
                    <h3>{course.title}</h3>
                    <p className={styles.description}>
                      {course.shortDescription}
                    </p>
                    <p className={styles.details}>
                      {course.lessonCount}{" "}
                      {course.lessonCount === 1 ? "lesson" : "lessons"}
                      {course.estimatedDuration > 0
                        ? ` · ${course.estimatedDuration} min`
                        : ""}
                      {price ? ` · ${price}` : ""}
                    </p>
                    {course.firstFreeLessonCount > 0 ? (
                      <p className={styles.trial}>Free lesson available</p>
                    ) : null}
                    <span className={styles.cardCta}>
                      View course and outline →
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className={styles.empty}>
              <h3>No published courses match these filters.</h3>
              <p>
                Try another level, direction, format or search phrase. Results
                are not filled with unrelated course content.
              </p>
              <Link href="/courses" className={styles.reset}>
                Reset all filters
              </Link>
            </div>
          )}
          {totalPages > 1 ? (
            <nav className={styles.pagination} aria-label="Course pages">
              {page > 1 ? (
                <Link
                  href={`/courses${makeQuery({ ...baseQuery, page: String(page - 1) })}`}
                  className={styles.pager}
                >
                  Previous
                </Link>
              ) : null}
              <span>
                Page {page} of {totalPages}
              </span>
              {page < totalPages ? (
                <Link
                  href={`/courses${makeQuery({ ...baseQuery, page: String(page + 1) })}`}
                  className={styles.pager}
                >
                  Next
                </Link>
              ) : null}
            </nav>
          ) : null}
        </section>
      </div>
    </main>
  );
}
