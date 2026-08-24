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
    "Browse published English courses by direction and CEFR level, or search for a topic.",
  alternates: { canonical: "/courses" },
  openGraph: {
    title: "English course catalogue",
    description:
      "Browse published English courses by direction and CEFR level, or search for a topic.",
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
  const query = first(params.q);
  const requestedCourseType = first(params.type);
  const courseType = courseTypes.find((type) => type === requestedCourseType);
  const requestedAccessPlan = first(params.access);
  const accessPlan =
    requestedAccessPlan === "FREE" ||
    requestedAccessPlan === "PREMIUM" ||
    requestedAccessPlan === "CORPORATE"
      ? requestedAccessPlan
      : undefined;
  const requestedSort = first(params.sort);
  const sort =
    requestedSort === "title" || requestedSort === "duration"
      ? requestedSort
      : "newest";
  const filters: CourseCatalogFilters = {
    query,
    levelCode,
    categorySlug,
    courseType,
    accessPlan,
    sort,
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
    access: accessPlan,
    sort: sort === "newest" ? undefined : sort,
  };
  const hasActiveFilters = Boolean(
    query || levelCode || categorySlug || courseType || accessPlan || sort !== "newest",
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
        <h1 className={styles.srOnly}>English course catalogue</h1>
        <form className={styles.topSearch} method="get" role="search">
          <label htmlFor="catalogue-keywords" className={styles.srOnly}>
            Search courses by keyword
          </label>
          <input
            id="catalogue-keywords"
            name="q"
            defaultValue={query}
            placeholder="Search courses, topics and skills"
          />
          {levelCode ? <input type="hidden" name="level" value={levelCode} /> : null}
          {categorySlug ? <input type="hidden" name="category" value={categorySlug} /> : null}
          {courseType ? <input type="hidden" name="type" value={courseType} /> : null}
          {accessPlan ? <input type="hidden" name="access" value={accessPlan} /> : null}
          {sort !== "newest" ? <input type="hidden" name="sort" value={sort} /> : null}
          <button className={styles.submit}>Search</button>
        </form>

        <div className={styles.catalogLayout}>
          <aside className={styles.filterSidebar} aria-label="Course filters">
            <div className={styles.filterSidebarHeader}>
              <p className={styles.filterEyebrow}>Find your course</p>
              <h2>Filters</h2>
            </div>
            <form className={styles.filterForm} method="get" role="search">
              {query ? <input type="hidden" name="q" value={query} /> : null}

              {categories.some((category) => category._count.courses > 0) ? (
                <section className={styles.filterSection} aria-labelledby="direction-filter-title">
                  <h3 id="direction-filter-title">Browse by direction</h3>
                  <div className={styles.directionList}>
                    <Link href={`/courses${makeQuery({ ...baseQuery, category: undefined, page: undefined })}`} className={`${styles.direction} ${!categorySlug ? styles.directionActive : ""}`}>All directions</Link>
                    {categories.filter((category) => category._count.courses > 0).map((category) => (
                      <Link key={category.id} href={`/courses${makeQuery({ ...baseQuery, category: category.slug, page: undefined })}`} className={`${styles.direction} ${category.slug === categorySlug ? styles.directionActive : ""}`}>
                        {category.icon ? <span aria-hidden="true">{category.icon} </span> : null}
                        {category.title}
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}

              {levels.length ? (
                <section className={styles.filterSection} aria-labelledby="level-filter-title">
                  <h3 id="level-filter-title">Browse by level</h3>
                  <div className={styles.directionList}>
                    <Link href={`/courses${makeQuery({ ...baseQuery, level: undefined, page: undefined })}`} className={`${styles.direction} ${!levelCode ? styles.directionActive : ""}`}>All levels</Link>
                    {levels.map((level) => (
                      <Link key={level.id} href={`/courses${makeQuery({ ...baseQuery, level: level.code, page: undefined })}`} className={`${styles.direction} ${level.code === levelCode ? styles.directionActive : ""}`}>
                        {level.code}
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}

              <section className={styles.filterSection} aria-label="Additional course filters">
                <label className={styles.field}>
                  Course format
                  <select name="type" defaultValue={courseType ?? ""}>
                    <option value="">All formats</option>
                    {courseTypes.map((type) => <option key={type} value={type}>{typeLabels[type]}</option>)}
                  </select>
                </label>
                <label className={styles.field}>
                  Access
                  <select name="access" defaultValue={accessPlan ?? ""}>
                    <option value="">All access types</option>
                    <option value="FREE">Free</option>
                    <option value="PREMIUM">Premium</option>
                    <option value="CORPORATE">Corporate</option>
                  </select>
                </label>
                <label className={styles.field}>
                  Sort by
                  <select name="sort" defaultValue={sort}>
                    <option value="newest">Newest first</option>
                    <option value="title">Title: A–Z</option>
                    <option value="duration">Shortest first</option>
                  </select>
                </label>
              </section>
              <div className={styles.filterActions}>
                <button className={styles.submit}>Apply filters</button>
                {hasActiveFilters ? <Link href="/courses" className={styles.reset}>Reset</Link> : null}
              </div>
            </form>
          </aside>

          <section className={styles.catalogue} aria-label="Published courses">
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
                    <div className={styles.cover}>
                      {course.coverImage ? (
                        <img src={course.coverImage} alt={`Cover for ${course.title}`} />
                      ) : (
                        <div className={styles.coverFallback} aria-hidden="true">
                          <span>{course.level.code}</span>
                        </div>
                      )}
                      <div className={styles.coverMeta}>
                        <span className={styles.levelChip}>{course.level.code}</span>
                        <span className={course.accessPlan === "FREE" ? styles.free : styles.premium}>
                          {accessLabel(course.accessPlan)}
                        </span>
                      </div>
                    </div>
                    <div className={styles.cardContent}>
                      <p className={styles.category}>{course.category.title}</p>
                      <h3>{course.title}</h3>
                      <div className={styles.details}>
                        {course.estimatedDuration > 0 ? <span>{course.estimatedDuration} min</span> : null}
                        {price ? <strong>{price}</strong> : null}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className={styles.empty}>
              <h3>No published courses match this search.</h3>
              <p>
                Try another keyword, direction or level. Results are not filled
                with unrelated course content.
              </p>
              <Link href="/courses" className={styles.reset}>
                Show all courses
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
      </div>
    </main>
  );
}
