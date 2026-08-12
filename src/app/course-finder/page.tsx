import Link from "next/link";
import type { Metadata } from "next";
import styles from "./course-finder.module.css";
import {
  listPublishedCourseCategories,
  listPublishedCourses,
  listPublishedLanguageLevels,
} from "@/modules/courses/services/content.service";
import type { CourseCatalogFilters } from "@/modules/courses/services/content.service";
import { getPublicCourseHref } from "@/modules/courses/utils/public-content-routes";
import { PublicSiteHeader } from "@/modules/navigation/components/PublicSiteHeader";

export const metadata: Metadata = {
  title: "Find an English course",
  description: "Filter published English courses by CEFR level, learning focus, pace and format.",
  alternates: { canonical: "/course-finder" },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const courseTypes = ["STANDARD", "INTENSIVE", "EXAM_PREP", "PROFESSIONAL", "SPECIALIZATION", "SKILL"] as const;
const typeLabels: Record<(typeof courseTypes)[number], string> = {
  STANDARD: "Standard course",
  INTENSIVE: "Intensive course",
  EXAM_PREP: "Exam preparation",
  PROFESSIONAL: "Professional English",
  SPECIALIZATION: "Specialisation",
  SKILL: "Skill course",
};

function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }

function formatPrice(amount: number | null, currency: string) {
  return amount === null ? null : new Intl.NumberFormat("en", { style: "currency", currency }).format(amount / 100);
}

export default async function CourseFinderPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const levelCode = first(params.level)?.toUpperCase();
  const categorySlug = first(params.goal);
  const intensity = first(params.intensity) === "short" ? "short" : first(params.intensity) === "extended" ? "extended" : undefined;
  const requestedType = first(params.format);
  const courseType = courseTypes.find((type) => type === requestedType);
  const filters: CourseCatalogFilters = {
    levelCode,
    categorySlug,
    courseType,
    sort: intensity === "short" ? "duration" : "newest",
    pageSize: 6,
  };
  const [levels, categories, courses] = await Promise.all([
    listPublishedLanguageLevels(),
    listPublishedCourseCategories(),
    listPublishedCourses(filters),
  ]);
  const selectedLevel = levels.find((level) => level.code === levelCode);
  const selectedCategory = categories.find((category) => category.slug === categorySlug);
  const hasCriteria = Boolean(levelCode || categorySlug || intensity || courseType);

  return <main className={styles.page}>
    <PublicSiteHeader />
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link className={styles.back} href="/">← Home</Link>
        <p className={styles.eyebrow}>Course finder</p>
        <h1>Find a published course using the choices you can explain.</h1>
        <p>Choose a level, direction, learning pace and format. Results come from the public course catalogue and never assign a level at random.</p>
        <p className={styles.disclosure}>This is a catalogue guide, not a placement test. If you are unsure of your level, review the level descriptions and course outcomes before enrolling.</p>
      </header>

      <form className={styles.finder} method="get">
        <label>Current or preferred level
          <select name="level" defaultValue={levelCode ?? ""}><option value="">Any published level</option>{levels.map((level) => <option key={level.id} value={level.code}>{level.code} — {level.title}</option>)}</select>
        </label>
        <label>What do you want to focus on?
          <select name="goal" defaultValue={categorySlug ?? ""}><option value="">Any published direction</option>{categories.filter((category) => category._count.courses > 0).map((category) => <option key={category.id} value={category.slug}>{category.title}</option>)}</select>
        </label>
        <label>Course duration preference
          <select name="intensity" defaultValue={intensity ?? ""}><option value="">No duration preference</option><option value="short">Show shorter published courses first</option><option value="extended">Show all published durations</option></select>
        </label>
        <label>Course format
          <select name="format" defaultValue={courseType ?? ""}><option value="">Any format</option>{courseTypes.map((type) => <option key={type} value={type}>{typeLabels[type]}</option>)}</select>
        </label>
        <div className={styles.actionRow}><button className={styles.primary}>Show matching courses</button><Link href="/course-finder" className={styles.secondary}>Reset</Link></div>
      </form>

      <section className={styles.results} aria-label="Course recommendations">
        <div className={styles.resultHeading}><h2>{hasCriteria ? "Matching published courses" : "Start with a few choices"}</h2><p>{courses.length} {courses.length === 1 ? "course" : "courses"} shown</p></div>
        <p className={styles.recommendationNote}>{hasCriteria ? "Each reason below describes the filter it matched; it is not a promise about learning outcomes." : "Select one or more filters to receive a short, explainable list."}</p>
        {courses.length ? <div className={styles.grid}>{courses.map((course) => {
          const price = formatPrice(course.priceAmount, course.priceCurrency);
          const reasons = [
            selectedLevel ? `Matches the level you selected: ${selectedLevel.code}.` : `Published for level ${course.level.code}.`,
            selectedCategory ? `Matches your chosen focus: ${selectedCategory.title}.` : `Focused on ${course.category.title}.`,
            courseType ? `Matches the selected format: ${typeLabels[courseType]}.` : `Format: ${typeLabels[course.courseType]}.`,
            intensity === "short" && course.estimatedDuration > 0 ? `Listed by shortest estimated total duration: ${course.estimatedDuration} minutes.` : null,
          ].filter((reason): reason is string => Boolean(reason));
          return <Link key={course.id} href={getPublicCourseHref(course.slug)} className={styles.card}>
            <div className={styles.chips}><span>{course.level.code}</span><span>{course.category.title}</span><span>{typeLabels[course.courseType]}</span></div>
            <h3>{course.title}</h3><p>{course.shortDescription}</p>
            <p className={styles.details}>{course.lessonCount} {course.lessonCount === 1 ? "lesson" : "lessons"}{course.estimatedDuration > 0 ? ` · ${course.estimatedDuration} min` : ""}{price ? ` · ${price}` : ""}</p>
            <ul className={styles.reasons}>{reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
            <span className={styles.cardCta}>{course.firstFreeLessonCount > 0 ? "Includes a free lesson · View course →" : "View course and access options →"}</span>
          </Link>;
        })}</div> : <div className={styles.empty}><h3>{hasCriteria ? "No published course matches these choices yet." : "Choose a starting point above."}</h3><p>{hasCriteria ? "Try another level, focus or format. The catalogue never fills this result with content from a different level." : "The finder will only recommend courses that are currently published and visible in the catalogue."}</p>{hasCriteria ? <Link className={styles.secondary} href="/course-finder">Reset choices</Link> : null}</div>}
        <Link href="/courses" className={styles.catalogueLink}>Open the full course catalogue →</Link>
      </section>
    </div>
  </main>;
}
