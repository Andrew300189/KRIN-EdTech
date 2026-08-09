import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/core/server/prisma";
import { CmsCourseAdvancedOperations } from "@/modules/cms/components/CmsCourseAdvancedOperations";
import { CmsCourseCurriculumLinks } from "@/modules/cms/components/CmsCourseCurriculumLinks";
import { CmsCourseDeletionControl } from "@/modules/cms/components/CmsCourseDeletionControl";
import { CmsCourseDetailsEditor } from "@/modules/cms/components/CmsCourseDetailsEditor";
import { CmsCourseRelationsPanel } from "@/modules/cms/components/CmsCourseRelationsPanel";
import { CmsCourseRevisionComparison } from "@/modules/cms/components/CmsCourseRevisionComparison";
import { CmsLifecycleControls } from "@/modules/cms/components/CmsLifecycleControls";
import { CmsModuleOperations } from "@/modules/cms/components/CmsModuleOperations";
import { CmsModuleCreationForm } from "@/modules/cms/components/CmsModuleCreationForm";
import { CmsPageShell } from "@/modules/cms/components/CmsPageShell";
import { getManagedCourse } from "@/modules/courses/services/content.service";
import { getCmsCourseDeletionImpact, getCmsCourseRelations } from "@/modules/cms/services/course-operations.service";

export default async function CmsCoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const course = await getManagedCourse((await params).courseId);
  if (!course) notFound();
  const [levels, relations, deletionImpact, revisions, selectableCourses] = await Promise.all([
    prisma.languageLevel.findMany({ orderBy: { order: "asc" }, select: { code: true, title: true } }),
    getCmsCourseRelations(course.id),
    getCmsCourseDeletionImpact(course.id),
    prisma.cmsContentVersion.findMany({ where: { entityType: "COURSE", entityId: course.id }, orderBy: { version: "desc" }, take: 30, include: { actor: { select: { name: true, email: true } } } }),
    prisma.course.findMany({ orderBy: [{ title: "asc" }], select: { id: true, title: true } }),
  ]);

  return <CmsPageShell eyebrow="Course editor" title={course.title} description={course.shortDescription} actions={<div className="flex gap-2"><Link href={`/cms/preview/courses/${course.id}`} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-white">Preview</Link><CmsLifecycleControls entityType="COURSE" entityId={course.id} status={course.contentStatus} compact /></div>}>
    <CmsCourseDetailsEditor course={{ id: course.id, title: course.title, shortDescription: course.shortDescription, fullDescription: course.fullDescription, coverImage: course.coverImage, estimatedDuration: course.estimatedDuration }} />
    <CmsCourseAdvancedOperations courseId={course.id} currentLevelCode={course.level.code} levels={levels} />
    <section className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-600">{course.level.code} · {course.category.title} · {course.modules.length} modules</p><CmsModuleCreationForm courseId={course.id} availableModules={course.modules.map((courseModule) => ({ id: courseModule.id, title: courseModule.title, order: courseModule.order }))} /></section>
    <CmsModuleOperations courseId={course.id} initialModules={course.modules} courses={selectableCourses} />
    <CmsCourseCurriculumLinks courseId={course.id} levelCode={course.level.code} initialLinks={course.curriculumLinks} />
    <CmsCourseRelationsPanel relations={relations} />
    <CmsCourseDeletionControl initialImpact={deletionImpact} />
    <CmsCourseRevisionComparison revisions={revisions.map((revision) => ({ id: revision.id, version: revision.version, action: revision.action, createdAt: revision.createdAt.toISOString(), actor: revision.actor, snapshot: revision.snapshot }))} />
  </CmsPageShell>;
}
