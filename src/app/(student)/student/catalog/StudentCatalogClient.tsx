"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LEARNING_ACADEMIES } from "@/modules/courses/constants/learning-paths";
import type { StudentCatalogCourse } from "@/modules/courses/services/student-catalog.service";
import styles from "./StudentCatalog.module.css";

type CatalogAccessFilter = "all" | "free" | "included" | "requires-access" | "added" | "not-added";
type CatalogSort = "recommended" | "title" | "level";

type StudentCatalogClientProps = {
  initialCourses: StudentCatalogCourse[];
  initialLevel?: string;
  initialQuery?: string;
  initialError?: string;
};

type QuickFilter = {
  id: string;
  label: string;
  matches: (course: StudentCatalogCourse) => boolean;
};

const levelCodes = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

const compactText = (course: StudentCatalogCourse) => [
  course.academySlug,
  course.pathSlug,
  course.stageSlug,
  course.title,
  course.shortDescription,
  course.fullDescription,
  course.category.slug,
  course.category.title,
].filter(Boolean).join(" ").toLocaleLowerCase();

const quickFilters: QuickFilter[] = [
  {
    id: "professional",
    label: "Professional English",
    matches: (course) => course.academySlug === "professional-english" || compactText(course).includes("professional"),
  },
  {
    id: "business",
    label: "Business English",
    matches: (course) => compactText(course).includes("business"),
  },
  {
    id: "grammar",
    label: "Grammar",
    matches: (course) => course.category.slug.includes("grammar") || compactText(course).includes("grammar"),
  },
  {
    id: "vocabulary",
    label: "Vocabulary",
    matches: (course) => course.category.slug.includes("vocabulary") || compactText(course).includes("vocabulary"),
  },
  {
    id: "exam-prep",
    label: "Exam preparation",
    matches: (course) => course.courseType === "EXAM_PREP" || compactText(course).includes("exam"),
  },
  {
    id: "travel",
    label: "Travel English",
    matches: (course) => /travel|tourism|hospitality/.test(compactText(course)),
  },
];

function formatSlug(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function getAcademyLabel(slug: string) {
  return LEARNING_ACADEMIES.find((academy) => academy.slug === slug)?.title ?? formatSlug(slug);
}

function accessLabel(course: StudentCatalogCourse) {
  if (course.inLibrary) return "In your library";
  if (course.entitled) return course.accessPlan === "FREE" ? "Free" : "Included";
  return "Access required";
}

export function StudentCatalogClient({
  initialCourses,
  initialLevel = "all",
  initialQuery = "",
  initialError = "",
}: StudentCatalogClientProps) {
  const router = useRouter();
  const [courses, setCourses] = useState(initialCourses);
  const [level, setLevel] = useState(initialLevel);
  const [quickFilter, setQuickFilter] = useState("all");
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState("all");
  const [academy, setAcademy] = useState("all");
  const [path, setPath] = useState("all");
  const [access, setAccess] = useState<CatalogAccessFilter>("all");
  const [sort, setSort] = useState<CatalogSort>("recommended");
  const [error, setError] = useState(initialError);
  const [adding, setAdding] = useState<string | null>(null);
  const [isRefreshing, startRefreshTransition] = useTransition();

  const categories = useMemo(
    () => [...new Map(courses.map((course) => [course.category.slug, course.category.title])).entries()]
      .map(([slug, title]) => ({ slug, title }))
      .sort((left, right) => left.title.localeCompare(right.title)),
    [courses],
  );
  const academies = useMemo(
    () => [...new Set(courses.map((course) => course.academySlug))]
      .sort((left, right) => getAcademyLabel(left).localeCompare(getAcademyLabel(right))),
    [courses],
  );
  const paths = useMemo(
    () => [...new Set(courses.map((course) => course.pathSlug))]
      .sort((left, right) => formatSlug(left).localeCompare(formatSlug(right))),
    [courses],
  );
  const availableQuickFilters = useMemo(
    () => quickFilters.filter((filter) => courses.some(filter.matches)),
    [courses],
  );
  const academyCourseCounts = useMemo(() => new Map(
    LEARNING_ACADEMIES.map((academy) => [
      academy.slug,
      courses.filter((course) => course.academySlug === academy.slug).length,
    ]),
  ), [courses]);

  const visibleCourses = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const selectedQuickFilter = quickFilters.find((filter) => filter.id === quickFilter);
    const filtered = courses.filter((course) => {
      const matchesAccess = access === "all"
        || access === "free" && course.accessPlan === "FREE"
        || access === "included" && course.entitled && course.accessPlan !== "FREE"
        || access === "requires-access" && !course.entitled
        || access === "added" && course.inLibrary
        || access === "not-added" && !course.inLibrary;
      return (
        (level === "all" || course.level.code === level)
        && (category === "all" || course.category.slug === category)
        && (academy === "all" || course.academySlug === academy)
        && (path === "all" || course.pathSlug === path)
        && matchesAccess
        && (!selectedQuickFilter || selectedQuickFilter.matches(course))
        && (!normalizedQuery || compactText(course).includes(normalizedQuery))
      );
    });

    return filtered.sort((left, right) => {
      if (sort === "title") return left.title.localeCompare(right.title);
      if (sort === "level") return left.level.code.localeCompare(right.level.code) || left.title.localeCompare(right.title);
      return Number(right.isFeatured) - Number(left.isFeatured) || left.title.localeCompare(right.title);
    });
  }, [academy, access, category, courses, level, path, query, quickFilter, sort]);

  const resetFilters = () => {
    setLevel("all");
    setQuickFilter("all");
    setQuery("");
    setCategory("all");
    setAcademy("all");
    setPath("all");
    setAccess("all");
    setSort("recommended");
  };

  const addCourse = async (courseId: string) => {
    if (adding) return;
    setAdding(courseId);
    setError("");

    try {
      const response = await fetch("/api/student/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? "Unable to add the course.");
      setCourses((items) => items.map((course) => course.id === courseId ? { ...course, inLibrary: true } : course));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to add the course.");
    } finally {
      setAdding(null);
    }
  };

  const retry = () => {
    setError("");
    startRefreshTransition(() => router.refresh());
  };

  return <section className={styles.page} aria-busy={isRefreshing || undefined}>
    <header className={styles.header}>
      <div>
        <p className={styles.eyebrow}>Learning catalog</p>
        <h2>Find the right course</h2>
        <p>Browse every published course, then narrow the selection by goal, level or learning path.</p>
      </div>
      <span className={styles.totalCount}>{courses.length} {courses.length === 1 ? "course" : "courses"}</span>
    </header>

    <nav className={styles.quickFilters} aria-label="Quick course filters">
      <button type="button" className={quickFilter === "all" && level === "all" ? styles.filterActive : ""} onClick={resetFilters}>All courses</button>
      {availableQuickFilters.map((filter) => <button key={filter.id} type="button" className={quickFilter === filter.id ? styles.filterActive : ""} onClick={() => setQuickFilter(filter.id)}>{filter.label}</button>)}
    </nav>

    <nav className={styles.levelFilters} aria-label="Filter courses by level">
      <span>Levels</span>
      <button type="button" className={level === "all" ? styles.levelActive : ""} onClick={resetFilters}>All courses</button>
      {levelCodes.map((code) => <button key={code} type="button" className={level === code ? styles.levelActive : ""} onClick={() => setLevel(code)}>{code}</button>)}
    </nav>

    {error ? <section className={styles.errorState} role="alert"><div><strong>Catalog could not be updated</strong><p>{error}</p></div><button type="button" onClick={retry} disabled={isRefreshing}>{isRefreshing ? "Loading…" : "Try again"}</button></section> : null}

    <div className={styles.catalogLayout}>
      <div className={styles.catalogMain}>
        <div className={styles.resultsHeading} aria-live="polite"><p>{visibleCourses.length} {visibleCourses.length === 1 ? "course" : "courses"} shown</p><span>{level === "all" ? "All levels" : `${level} courses`}</span></div>
        {visibleCourses.length === 0 ? <section className={styles.emptyState}><h3>No courses match these filters</h3><p>Reset the current filters to see every published course again.</p><button type="button" onClick={resetFilters}>Show all courses</button></section> : <div className={styles.courseGrid} aria-label="Published courses">
          {visibleCourses.map((course) => <article key={course.id} className={styles.courseCard}>
            <div className={styles.cardMeta}><span>{course.level.code}</span><span title={course.category.title}>{course.category.title}</span></div>
            <Link href={`/courses/catalog/${course.slug}`} className={styles.courseLink} aria-label={`Open ${course.title}`}>
              <h3>{course.title}</h3>
              <p>{course.shortDescription ?? course.fullDescription ?? "Course details are being prepared."}</p>
            </Link>
            <div className={styles.cardFooter}>
              <span className={course.entitled ? styles.accessGranted : styles.accessLocked}>{accessLabel(course)}</span>
              {course.inLibrary ? <Link href="/student/courses" className={styles.cardAction}>My courses</Link> : course.entitled ? <button type="button" className={styles.primaryCardAction} onClick={() => void addCourse(course.id)} disabled={adding === course.id}>{adding === course.id ? "Adding…" : "Add"}</button> : <Link href="/pricing" className={styles.cardAction}>Access</Link>}
            </div>
          </article>)}
        </div>}
      </div>

      <aside className={styles.filterSidebar} aria-label="Advanced course filters">
        <div className={styles.filterHeader}><div><p className={styles.eyebrow}>Refine results</p><h3>Advanced filters</h3></div><button type="button" onClick={resetFilters}>Clear</button></div>
        <label>Search this catalog<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Course, topic or goal" /></label>
        <label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All categories</option>{categories.map((item) => <option key={item.slug} value={item.slug}>{item.title}</option>)}</select></label>
        <label>Learning direction<select value={academy} onChange={(event) => setAcademy(event.target.value)}><option value="all">All directions</option>{academies.map((slug) => <option key={slug} value={slug}>{getAcademyLabel(slug)}</option>)}</select></label>
        <label>Learning path<select value={path} onChange={(event) => setPath(event.target.value)}><option value="all">All paths</option>{paths.map((slug) => <option key={slug} value={slug}>{formatSlug(slug)}</option>)}</select></label>
        <label>Access<select value={access} onChange={(event) => setAccess(event.target.value as CatalogAccessFilter)}><option value="all">All access</option><option value="free">Free</option><option value="included">Included in your plan</option><option value="requires-access">Requires access</option><option value="added">In my library</option><option value="not-added">Not added</option></select></label>
        <label>Sort<select value={sort} onChange={(event) => setSort(event.target.value as CatalogSort)}><option value="recommended">Recommended</option><option value="title">Title</option><option value="level">Level</option></select></label>
      </aside>
    </div>

    <section id="academies" className={styles.academies} aria-labelledby="academies-heading">
      <header className={styles.academiesHeader}>
        <div><p className={styles.eyebrow}>Explore by skill</p><h3 id="academies-heading">Academies</h3><p>Focused paths for a specific language skill or professional goal.</p></div>
        <span>{LEARNING_ACADEMIES.length} academies</span>
      </header>
      <div className={styles.academyGrid}>
        {LEARNING_ACADEMIES.map((academy) => <Link key={academy.slug} href={`/student/catalog/academies/${academy.slug}`} className={styles.academyCard} aria-label={`Open ${academy.title}`}>
          <div><span>{academy.paths.length} paths</span><h4>{academy.title}</h4></div>
          <p>{academyCourseCounts.get(academy.slug) ?? 0} published {academyCourseCounts.get(academy.slug) === 1 ? "course" : "courses"}</p>
          <strong>Explore academy →</strong>
        </Link>)}
      </div>
    </section>
  </section>;
}
