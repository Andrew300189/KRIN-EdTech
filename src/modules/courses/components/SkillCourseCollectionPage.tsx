import Link from "next/link";
import { courseSkillLevels, type CourseSkillDefinition } from "@/modules/courses/data/skill-course-catalog";
import { listPublishedCourses } from "@/modules/courses/services/content.service";
import { getPublicCourseHref } from "@/modules/courses/utils/public-content-routes";
import { PublicSiteHeader } from "@/modules/navigation/components/PublicSiteHeader";
import styles from "./SkillCourseCollectionPage.module.css";

function getSkillHref(skillSlug: string, level?: string) {
  return level ? `/courses/skills/${skillSlug}?level=${level}` : `/courses/skills/${skillSlug}`;
}

function accessLabel(plan: "FREE" | "BASIC" | "PREMIUM" | "PRO" | "CORPORATE") {
  return plan === "FREE" ? "Free access" : plan === "CORPORATE" ? "Corporate access" : "Subscription access";
}

export async function SkillCourseCollectionPage({ skill, selectedLevel }: { skill: CourseSkillDefinition; selectedLevel: (typeof courseSkillLevels)[number] | null }) {
  const courses = await listPublishedCourses({
    categorySlugs: skill.categorySlugs,
    ...(selectedLevel ? { levelCode: selectedLevel } : {}),
    pageSize: 48,
    sort: "newest",
  });
  const selectedLabel = selectedLevel ? `${selectedLevel} courses` : "All levels";

  return <main className={styles.page}>
    <PublicSiteHeader />
    <div className={styles.shell}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>Skill courses</p>
        <h1>{skill.title}</h1>
        <p className={styles.intro}>{skill.description}</p>
        <nav className={styles.filterBlock} aria-label={`${skill.label} level filter`}>
          <p className={styles.filterLabel}>Filter by English level</p>
          <div className={styles.filterLinks}>
            <Link href={getSkillHref(skill.slug)} className={`${styles.filterLink} ${!selectedLevel ? styles.filterLinkActive : ""}`}>All levels</Link>
            {courseSkillLevels.map((level) => <Link key={level} href={getSkillHref(skill.slug, level)} className={`${styles.filterLink} ${selectedLevel === level ? styles.filterLinkActive : ""}`}>{level}</Link>)}
          </div>
        </nav>
      </header>
      <section aria-label={`${skill.label} course results`}>
        <div className={styles.summary}><h2>{selectedLabel}</h2><p>{courses.length} {courses.length === 1 ? "course" : "courses"}</p></div>
        {courses.length ? <div className={styles.grid}>{courses.map((course) => <Link key={course.id} href={getPublicCourseHref(course.slug)} className={styles.card}><div className={styles.chips}><span>{course.level.code}</span><span>{course.category.title}</span><span className={course.accessPlan === "FREE" ? styles.free : styles.paid}>{accessLabel(course.accessPlan)}</span></div><h3>{course.title}</h3><p className={styles.description}>{course.shortDescription}</p><p className={styles.details}>{course.lessonCount} {course.lessonCount === 1 ? "lesson" : "lessons"}{course.estimatedDuration > 0 ? ` · ${course.estimatedDuration} min` : ""}</p><span className={styles.cardLink}>View course and programme →</span></Link>)}</div> : <div className={styles.empty}><h2>No published courses yet</h2><p>Courses for this exact skill and level will appear here as soon as they are published in the CMS. We do not substitute material from another level.</p><Link href="/courses">Browse the full catalogue</Link></div>}
      </section>
    </div>
  </main>;
}
