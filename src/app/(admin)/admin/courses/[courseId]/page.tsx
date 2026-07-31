import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminLessonForm, AdminModuleForm } from "@/modules/courses/components/admin/ContentForms";
import { getManagedCourse } from "@/modules/courses/services/content.service";

export default async function AdminCourseDetailPage({ params }: { params: Promise<{ courseId: string }> }) {
  const course = await getManagedCourse((await params).courseId);
  if (!course) notFound();
  return <div><Link href="/admin/courses" className="text-sm font-semibold text-blue-700 hover:underline">← Courses</Link><h1 className="mt-4 text-3xl font-bold">{course.title}</h1><p className="mt-2 text-gray-600">{course.shortDescription}</p><AdminModuleForm courseId={course.id} /><section className="mt-8 space-y-4"><h2 className="text-2xl font-bold">Modules</h2>{course.modules.length === 0 ? <p className="rounded-xl border border-dashed border-gray-300 p-5 text-gray-600">Create a module to add lessons.</p> : course.modules.map((module) => <article key={module.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><h3 className="text-xl font-bold">{module.order}. {module.title}</h3>{module.description ? <p className="mt-1 text-gray-600">{module.description}</p> : null}<p className="mt-2 text-sm text-gray-500">{module._count.lessons} lessons · {module.isPublished ? "Published" : "Draft"}</p>{module.lessons.length > 0 ? <ul className="mt-4 space-y-2">{module.lessons.map((lesson) => <li key={lesson.id}><Link href={`/admin/lessons/${lesson.id}`} className="text-sm font-semibold text-blue-700 hover:underline">{lesson.order}. {lesson.title} ({lesson.isPublished ? "published" : "draft"})</Link></li>)}</ul> : null}<AdminLessonForm moduleId={module.id} /></article>)}</section></div>;
}
