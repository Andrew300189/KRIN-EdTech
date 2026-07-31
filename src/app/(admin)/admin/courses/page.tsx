import Link from "next/link";
import { prisma } from "@/core/server/prisma";
import { AdminCourseForm } from "@/modules/courses/components/admin/ContentForms";
import { listManagedCourses } from "@/modules/courses/services/content.service";

export default async function AdminCoursesPage() {
  const [courses, levels, categories] = await Promise.all([
    listManagedCourses(),
    prisma.languageLevel.findMany({ orderBy: { order: "asc" }, select: { code: true, title: true } }),
    prisma.courseCategory.findMany({ where: { isPublished: true }, orderBy: { order: "asc" }, select: { slug: true, title: true } }),
  ]);
  return <div className="space-y-7"><header><h1 className="text-3xl font-bold">Course CMS</h1><p className="mt-2 text-gray-600">Create and manage CEFR courses stored in PostgreSQL.</p></header><AdminCourseForm levels={levels} categories={categories} /><section><h2 className="text-xl font-bold">Courses</h2>{courses.length === 0 ? <p className="mt-3 rounded-xl border border-dashed border-gray-300 p-5 text-gray-600">No courses have been created yet.</p> : <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white"><table className="w-full text-left text-sm"><thead className="bg-gray-50 text-gray-600"><tr><th className="px-4 py-3">Course</th><th className="px-4 py-3">Level</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Modules</th></tr></thead><tbody>{courses.map((course) => <tr key={course.id} className="border-t border-gray-100"><td className="px-4 py-3"><Link href={`/admin/courses/${course.id}`} className="font-semibold text-blue-700 hover:underline">{course.title}</Link><p className="mt-1 text-xs text-gray-500">{course.instructor.email}</p></td><td className="px-4 py-3">{course.level.code}</td><td className="px-4 py-3">{course.isPublished ? "Published" : "Draft"}</td><td className="px-4 py-3">{course._count.modules}</td></tr>)}</tbody></table></div>}</section></div>;
}
