import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/core/server/prisma";
import { CmsModuleDetailsEditor } from "@/modules/cms/components/CmsCourseDetailsEditor";
import { CmsLessonOperations } from "@/modules/cms/components/CmsLessonOperations";
import { CmsLifecycleControls } from "@/modules/cms/components/CmsLifecycleControls";
import { CmsPageShell } from "@/modules/cms/components/CmsPageShell";
import { AdminLessonForm } from "@/modules/courses/components/admin/ContentForms";

export default async function CmsModulePage({ params }: { params: Promise<{ moduleId: string }> }) {
  const moduleId = (await params).moduleId;
  const courseModule = await prisma.courseModule.findUnique({
    where: { id: moduleId },
    include: {
      course: { select: { id: true, title: true, level: { select: { code: true } } } },
      lessons: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          type: true,
          order: true,
          contentStatus: true,
          prerequisiteLessonId: true,
          requiredPrerequisiteCompletion: true,
          autoUnlockNextLesson: true,
          _count: { select: { blocks: true } },
        },
      },
    },
  });
  if (!courseModule) notFound();
  const siblings = await prisma.courseModule.findMany({ where: { courseId: courseModule.courseId }, orderBy: { order: "asc" }, select: { id: true, title: true, order: true } });
  return <CmsPageShell eyebrow={`${courseModule.course.level.code} · ${courseModule.course.title}`} title={courseModule.title} description={courseModule.description ?? "No module description."} actions={<div className="flex gap-2"><Link href={`/cms/preview/modules/${courseModule.id}`} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-white">Preview</Link><CmsLifecycleControls entityType="COURSE_MODULE" entityId={courseModule.id} status={courseModule.contentStatus} compact /></div>}><CmsModuleDetailsEditor module={courseModule} availableModules={siblings} /><CmsLessonOperations moduleId={courseModule.id} initialLessons={courseModule.lessons} targetModules={siblings} /><section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-xl font-bold text-slate-950">Add lesson</h2><p className="mt-1 text-sm text-slate-600">New lessons are drafts; add blocks and publish only after the content is ready.</p><AdminLessonForm moduleId={courseModule.id} /></section></CmsPageShell>;
}
