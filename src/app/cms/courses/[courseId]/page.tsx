import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/core/server/prisma";
import { CmsCourseDeletionControl } from "@/modules/cms/components/CmsCourseDeletionControl";
import { CmsCourseDetailsEditor, CmsCourseDetailsEditTrigger } from "@/modules/cms/components/CmsCourseDetailsEditor";
import { CmsCourseRelationsPanel } from "@/modules/cms/components/CmsCourseRelationsPanel";
import { CmsCourseRevisionComparison } from "@/modules/cms/components/CmsCourseRevisionComparison";
import { CmsLifecycleControls } from "@/modules/cms/components/CmsLifecycleControls";
import { CmsPageShell } from "@/modules/cms/components/CmsPageShell";
import { getManagedCourse } from "@/modules/courses/services/content.service";
import { getCmsCourseDeletionImpact, getCmsCourseRelations } from "@/modules/cms/services/course-operations.service";
import { getCourseDurationEstimate } from "@/modules/cms/services/course-duration.service";
import styles from "./CourseEditor.module.css";

export default async function CmsCoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const course = await getManagedCourse((await params).courseId);
  if (!course) notFound();
  const [relations, deletionImpact, revisions, duration] = await Promise.all([
    getCmsCourseRelations(course.id),
    getCmsCourseDeletionImpact(course.id),
    prisma.cmsContentVersion.findMany({ where: { entityType: "COURSE", entityId: course.id }, orderBy: { version: "desc" }, take: 30, include: { actor: { select: { name: true, email: true } } } }),
    getCourseDurationEstimate(course.id),
  ]);
  const statusDescription = course.contentStatus === "PUBLISHED" ? "Available to eligible learners" : course.contentStatus === "SCHEDULED" ? "Waiting for its scheduled publication time" : "Not currently available to learners";
  const levelClass = styles[`level${course.level.code}`] ?? styles.levelDefault;

  return <CmsPageShell dense eyebrow="Course editor" title={course.title} titleMeta={<div className={styles.courseMeta}><span className={`${styles.levelBadge} ${levelClass}`}>{course.level.code}</span><span className={styles.categoryBadge}>{course.category.title}</span></div>} description={course.shortDescription} actions={<div className={styles.pageActions}><CmsCourseDetailsEditTrigger className={styles.editLink} /><Link href="/cms/courses" className={styles.backLink}>All courses</Link><Link href={`/cms/preview/courses/${course.id}`} className={styles.previewLink}>Preview</Link></div>}>
    <CmsCourseRelationsPanel relations={relations} />
    <section className={styles.publicationBar} aria-label="Course publication controls">
      <div className={styles.publicationSummary}>
        <span>Publication</span>
        <strong className={course.contentStatus === "PUBLISHED" ? styles.publishedStatus : styles.draftStatus}>{course.contentStatus.replace(/_/g, " ")}</strong>
        <small>{statusDescription}</small>
      </div>
      <div className={styles.publicationActions}>
        <CmsLifecycleControls entityType="COURSE" entityId={course.id} status={course.contentStatus} compact className={styles.courseLifecycle} />
        <CmsCourseRevisionComparison revisions={revisions.map((revision) => ({ id: revision.id, version: revision.version, action: revision.action, createdAt: revision.createdAt.toISOString(), actor: revision.actor, snapshot: revision.snapshot }))} />
        <CmsCourseDeletionControl initialImpact={deletionImpact} className={styles.courseDeletion} />
      </div>
    </section>
    <CmsCourseDetailsEditor course={{ id: course.id, title: course.title, shortDescription: course.shortDescription, fullDescription: course.fullDescription, coverImage: course.coverImage, duration, modules: course.modules.map((courseModule) => ({ id: courseModule.id, title: courseModule.title, order: courseModule.order, lessons: courseModule.lessons.map((lesson) => ({ id: lesson.id, title: lesson.title, order: lesson.order })) })) }} />
  </CmsPageShell>;
}
