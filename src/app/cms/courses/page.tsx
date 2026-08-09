import { prisma } from "@/core/server/prisma";
import { CmsCourseWorkspace } from "@/modules/cms/components/CmsCourseWorkspace";
import { listManagedCourses } from "@/modules/courses/services/content.service";

export default async function CmsCoursesPage() {
  const [courses, levels, categories] = await Promise.all([
    listManagedCourses(),
    prisma.languageLevel.findMany({ orderBy: { order: "asc" }, select: { code: true, title: true } }),
    prisma.courseCategory.findMany({ orderBy: { order: "asc" }, select: { slug: true, title: true } }),
  ]);
  return <CmsCourseWorkspace levels={levels} categories={categories} initialCourses={courses.map((course) => ({ id: course.id, slug: course.slug, title: course.title, shortDescription: course.shortDescription, order: course.order, contentStatus: course.contentStatus, isTemplate: course.isTemplate, level: course.level, category: course.category, modules: course._count.modules }))} />;
}
