import Link from "next/link";
import type { CourseType } from "@/generated/prisma-client-payments-runtime";
import { PublicSiteHeader } from "@/modules/navigation/components/PublicSiteHeader";
import { listPublishedCourses } from "@/modules/courses/services/content.service";
import { getPublicCourseHref } from "@/modules/courses/utils/public-content-routes";
import styles from "./CourseCollectionPage.module.css";

const labels: Record<CourseType, string> = {
  STANDARD: "Standard course",
  INTENSIVE: "Intensive course",
  EXAM_PREP: "Exam preparation",
  PROFESSIONAL: "Professional English",
  SPECIALIZATION: "Specialisation",
  SKILL: "Skill course",
};

function accessLabel(plan: "FREE" | "BASIC" | "PREMIUM" | "PRO" | "CORPORATE") {
  if (plan === "FREE") return "Free access";
  if (plan === "CORPORATE") return "Corporate access";
  return "Subscription access";
}

function formatPrice(amount: number | null, currency: string) {
  return amount === null ? null : new Intl.NumberFormat("en", { style: "currency", currency }).format(amount / 100);
}

export function CourseCollectionPage({ type, eyebrow, title, introduction, emptyTitle, emptyDescription, relatedHref, relatedLabel }: { type: CourseType; eyebrow: string; title: string; introduction: string; emptyTitle: string; emptyDescription: string; relatedHref: string; relatedLabel: string }) {
  return <CourseCollectionPageData type={type} eyebrow={eyebrow} title={title} introduction={introduction} emptyTitle={emptyTitle} emptyDescription={emptyDescription} relatedHref={relatedHref} relatedLabel={relatedLabel} />;
}

async function CourseCollectionPageData({ type, eyebrow, title, introduction, emptyTitle, emptyDescription, relatedHref, relatedLabel }: { type: CourseType; eyebrow: string; title: string; introduction: string; emptyTitle: string; emptyDescription: string; relatedHref: string; relatedLabel: string }) {
  const courses = await listPublishedCourses({ courseType: type, pageSize: 24, sort: "newest" });
  return <main className={styles.page}><PublicSiteHeader /><div className={styles.shell}><header className={styles.hero}><p className={styles.eyebrow}>{eyebrow}</p><h1>{title}</h1><p>{introduction}</p><div className={styles.heroActions}><Link href="/courses" className={styles.primaryAction}>Browse all courses</Link><Link href={relatedHref} className={styles.secondaryAction}>{relatedLabel}</Link></div></header><section className={styles.collection} aria-label={title}><div className={styles.collectionHeading}><h2>Published courses</h2><p>{courses.length} {courses.length === 1 ? "course" : "courses"}</p></div>{courses.length ? <div className={styles.grid}>{courses.map((course) => { const price = formatPrice(course.priceAmount, course.priceCurrency); return <Link key={course.id} href={getPublicCourseHref(course.slug)} className={styles.card}><div className={styles.chips}><span>{course.level.code}</span><span>{course.category.title}</span><span>{labels[course.courseType]}</span><span className={course.accessPlan === "FREE" ? styles.free : styles.paid}>{accessLabel(course.accessPlan)}</span></div><h3>{course.title}</h3><p className={styles.description}>{course.shortDescription}</p><p className={styles.details}>{course.lessonCount} {course.lessonCount === 1 ? "lesson" : "lessons"}{course.estimatedDuration > 0 ? ` · ${course.estimatedDuration} min` : ""}{price ? ` · ${price}` : ""}</p>{course.firstFreeLessonCount > 0 ? <p className={styles.trial}>Published preview lesson available</p> : null}<span className={styles.cardLink}>View course and programme →</span></Link>; })}</div> : <div className={styles.empty}><h2>{emptyTitle}</h2><p>{emptyDescription}</p><p>Only published courses of this exact type will appear here; other catalogue content is not substituted.</p><Link href="/courses" className={styles.secondaryAction}>Open the full catalogue</Link></div>}</section></div></main>;
}
