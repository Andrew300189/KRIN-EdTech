import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/core/server/role-guard";
import { getAcademyBySlug } from "@/modules/courses/constants/learning-paths";
import { listStudentCatalogCourses } from "@/modules/courses/services/student-catalog.service";
import styles from "./StudentAcademy.module.css";

function accessLabel(course: { inLibrary: boolean; entitled: boolean; accessPlan: string }) {
  if (course.inLibrary) return "In your library";
  if (course.entitled) return course.accessPlan === "FREE" ? "Free" : "Included";
  return "Access required";
}

/** Current learner academy view; never links back to the legacy dashboard. */
export default async function StudentAcademyPage({
  params,
}: {
  params: Promise<{ academySlug: string }>;
}) {
  const guard = await requireRole(["student"]);
  if (!guard.ok) return null;

  const academySlug = (await params).academySlug;
  const academy = getAcademyBySlug(academySlug);
  if (!academy) notFound();

  const courses = (await listStudentCatalogCourses(guard.user.id))
    .filter((course) => course.academySlug === academy.slug);

  return <section className={styles.page}>
    <Link href="/student/catalog#academies" className={styles.backLink}>← Back to catalog</Link>
    <header className={styles.header}>
      <p className={styles.eyebrow}>Academy</p>
      <h2>{academy.title}</h2>
      <p>Choose a focused path, explore the published courses and continue in the same learning workspace.</p>
    </header>

    <section className={styles.paths} aria-labelledby="academy-paths-heading">
      <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Learning paths</p><h3 id="academy-paths-heading">Build the skill step by step</h3></div><span>{academy.paths.length} paths</span></div>
      <div className={styles.pathGrid}>
        {academy.paths.map((path, index) => <article key={path.slug} className={styles.pathCard}><span>{String(index + 1).padStart(2, "0")}</span><h4>{path.title}</h4><p>Courses for this path appear here as they are published in the catalog.</p></article>)}
      </div>
    </section>

    <section className={styles.courses} aria-labelledby="academy-courses-heading">
      <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Published courses</p><h3 id="academy-courses-heading">Available in this academy</h3></div><span>{courses.length} {courses.length === 1 ? "course" : "courses"}</span></div>
      {courses.length ? <div className={styles.courseGrid}>{courses.map((course) => <article key={course.id} className={styles.courseCard}><div className={styles.cardMeta}><span>{course.level.code}</span><span>{course.category.title}</span></div><Link href={`/courses/catalog/${course.slug}`} className={styles.courseLink}><h4>{course.title}</h4><p>{course.shortDescription ?? course.fullDescription ?? "Course details are being prepared."}</p></Link><footer><span className={course.entitled ? styles.accessGranted : styles.accessLocked}>{accessLabel(course)}</span><Link href={`/courses/catalog/${course.slug}`}>View course</Link></footer></article>)}</div> : <div className={styles.emptyState}><h4>Courses are being prepared</h4><p>This academy already has its learning paths. Published courses will appear here automatically from the catalog.</p><Link href="/student/catalog">Browse all courses</Link></div>}
    </section>
  </section>;
}
